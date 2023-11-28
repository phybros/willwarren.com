---
date: "2015-10-12T14:43:51-04:00"
ogimage: "/images/2015/10/12/sql-server-logo.png"
title: "SQL Server: Enabling Read Committed Snapshot Isolation"
tags: ["sql", "database", "sysadmin"]
description: "Enabling Read Committed Snapshot Isolation (RCSI) is one way to prevent reads (`SELECT` statements) from escalating into full table locks. Depending on your application this can either be a good or a bad thing. Read more to find out how to enable it!"
---

When using Microsoft SQL Server, enabling Read Committed Snapshot Isolation (RCSI) is one way to prevent reads (`SELECT` statements) from escalating into full table locks. Depending on your application this can either be a good or a bad thing. I'm not going to get into the why's and why-nots of each strategy - [this is a good article to read](https://technet.microsoft.com/en-us/library/ms188277.aspx) if you're having a hard time deciding which strategy to choose and why.

So let's say you want to enable RCSI on a fictional database `MyDB`. This can be achieved by simply issuing the following T-SQL:

```sql
ALTER DATABASE MyDB SET READ_COMMITTED_SNAPSHOT ON
GO
```

To check that it was successfully enabled, you can check the System View `sys.databases`:

```sql
SELECT is_read_committed_snapshot_on
FROM sys.databases
WHERE [name] = 'MyDB'
```

If it returns `1` then RCSI was successfully applied, you're done! Unless...
<!--more-->
## Can't get database lock

Oftentimes, the above T-SQL will just hang forever. 99% of the time this is because there are still active connections to the target database (`MyDB` in this case).

You can apply the RCSI change and rollback any active transactions at the same time by running:

```sql
ALTER DATABASE MyDB SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE
GO
```

Depending on your application this might not be the best way and there are a few different ways you can tackle this that could give you more control over how any when the existing transactions get `ROLLBACK`ed:

 1. Shut your app down, take the downtime and enable RCSI
 2. Disconnect your app's database connections and enable RCSI (hopefully it can reconnect automatically)
 3. (Advanced) enable RCSI on a hot-replica or mirror database and fail your app over to that server, enable RCSI on the primary, and then fail back (urge to drink: _rising_)

Having needed to enable RCSI on an active application with active database connections in the past, I've found that option 2 works well as long as you do it during off-hours (obviously - who does database maintenance during peak anyways right? _Right? Guys??_)

Here's a script that can do this (using `MyDB` again as example):

```sql
-- Switch over to master to avoid hanging connection problems
USE master
GO

/**
 * Cut off live connections
 * This will roll back any open transactions after 30 seconds and
 * restricts access to the DB to logins with sysadmin, dbcreator or
 * db_owner roles
 */
ALTER DATABASE MyDB SET RESTRICTED_USER WITH ROLLBACK AFTER 30 SECONDS
GO

-- Enable RCSI for MyDB
ALTER DATABASE MyDB SET READ_COMMITTED_SNAPSHOT ON
GO

-- Allow connections to be established once again
ALTER DATABASE MyDB SET MULTI_USER
GO

-- Check the status afterwards to make sure it worked
SELECT is_read_committed_snapshot_on
FROM sys.databases
WHERE [name] = 'MyDB'
```

**Note:** _you could also put the DB into `SINGLE_USER` mode but if you have active client connections, this is probably a bad idea because one of them might end up snatching up the single available connection._

If that last `SELECT` returned `1` then you are done! Pat yourself on the back and enjoy your favorite beverage.

## The problem with Mirroring

Of course, if you try and enable RCSI on a database that is part of a mirroring partnership, then you're likely going to run into this awesome error message:

```text
The operation cannot be performed on database "MyDB" because it is involved in a database mirroring session.
```

This is a relatively easy one to solve. You just need to temporarily disable, and then reenable the mirroring partnership.

```sql
USE master
GO

-- Break the partnership
ALTER DATABASE MyDB SET PARTNER OFF
GO

-- Restrict access
ALTER DATABASE MyDB SET RESTRICTED_USER WITH ROLLBACK AFTER 30 SECONDS
GO

-- Enable RCSI for MyDB
ALTER DATABASE MyDB SET READ_COMMITTED_SNAPSHOT ON
GO

-- Allow connections to be established once again
ALTER DATABASE MyDB SET MULTI_USER
GO

-- Re-enable the partnership
ALTER DATABASE MyDB SET PARTNER = 'tcp://MyDBPartnerHost:5022'
GO
```

Again, check the `sys.databases` view for confirmation that it worked.

These steps also apply many other database-level configuration changes. Many of them block on open client connections and so will need to be taken into `RESTRICTED_USER` or `SINGLE_USER` while the change takes effect.

Hopefully this article helped someone - please leave a comment if it helped you, or if you have any issues.
