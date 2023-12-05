+++
Description = ""
date = 2011-08-30
title = "An ASCII needle in an Extended ASCII haystack"
slug = "an-ascii-needle-in-an-extended-ascii-haystack"
tags = ["java", "coding", "database"]

+++

I was tasked with writing some code to pull all the research project data that we'd collected over the past 10-15 years into our new J2EE-based product, Kuali Coeus. The legacy system ran off SQL Server which is a lot more forgiving of character encodings and string data in general than the new system (which runs off MySQL).

It had taken me a while to figure out a way to map all the old data onto the new data structures, but I felt like I had done a pretty awesome job. The few batches I had tested it with all passed its tests with no problems. However when I unleashed it on a full dataset (some 6000 rows), about 60% (roughly 2 hours) of the way through, it crashed, and rolled the ENTIRE thing back.
<!--more-->

The web app protested:

> The Project Title (title) may only consist of visible characters, spaces, or tabs.

Needless to say I was very confused, but then I realized that much of the data was probably copied and pasted from MS Word or similar software which is notorious for putting all sorts of weird characters into documents.

I caught a lucky break when I was just browsing through the data in SQLyog, and saw this (Note: this is not real data, but it represents my point):

```text
The title of a project…
```

There was an [Ellipsis](http://en.wikipedia.org/wiki/Ellipsis) character at the end of this, and several other Titles throughout the data. Of course, what with the Ellipsis being ASCII code No problem, a quick bit of SQL scripting should do the trick:

```sql
UPDATE projects SET title = REPLACE(title, '…', '...');
```

A quick restart of the webapp later and everything was running smoothly. The load had progressed past the point where it failed last time, which confirmed to me that it had to have been the Ellipsises (Ellipsi?) that were the cause of my earlier grief.

Of course, I couldn't get that lucky. Over the years I've learned that if programming is good for one thing, it's making you realize that you're nothing more than a puny human bashing the keyboard at random, just killing time until the machines inevitably rise up and inherit the Earth.

This time, the load had made through about 96% of the data before crapping out and rolling the whole lot back again:

> The Project Title (title) may only consist of visible characters, spaces, or tabs.

**Me:** What? Didn't I just fix that?

**Computer:** Kill all humans.

The record that it died on was this (Note: again, not real data):

```text
Computers – Will they inherit the Earth?
```

Well, maybe the code that I wrote to tell me what record it was currently processing is on the fritz because that looks fine to me. Assuming that, there must be some other characters somewhere else in all this data that are "invisible". Luckily MySQL has the ability to look for this sort of thing. Knowing that all "visible" characters are between HEX 00 and FF, the following regex should show me all the "illegal" titles:

```sql
mysql> SELECT title FROM projects WHERE NOT HEX(title) REGEXP '^([0-7][0-9A-F])*$';
+--------------------------------------------+
| title                                      |
+--------------------------------------------+
| Computers – Will they inherit the Earth?   |
+--------------------------------------------+
1 row in set (0.00 sec)
```

So, using my powers of deduction, I had to conclude that the offending character had to be that hyphen (or fake hyphen in a hyphen suit).

```sql
mysql> SELECT HEX('-') AS hyphen, HEX('-') AS might_be_a_hyphen;
+--------+-------------------+
| hyphen | might_be_a_hyphen |
+--------+-------------------+
| 2D     | E28093            |
+--------+-------------------+
1 row in set (0.00 sec)
```

It's definitely not a hyphen. A bit of googling and it turns out that it's an EN DASH:

> The en dash can also be used to contrast values, or illustrate a relationship between two things.

Also, its value is above that which Kuali would consider "legal". All I had to do was replace that en dash with a regular hyphen, and everything worked like a charm.

It wasn't the first time character values have bitten me in the proverbial butt, and I can guarantee you that it will NOT be the last.

Sources: [http://en.wikipedia.org/wiki/Dash](http://en.wikipedia.org/wiki/Dash), [http://en.wikipedia.org/wiki/Ellipsis](http://en.wikipedia.org/wiki/Ellipsis)
