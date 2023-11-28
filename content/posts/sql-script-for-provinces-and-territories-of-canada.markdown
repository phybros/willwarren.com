+++
date = "2012-01-30 18:48:23+00:00"
title = "SQL Script for Provinces and Territories of Canada"
slug = "sql-script-for-provinces-and-territories-of-canada"
tags = ["database", "projects"]

+++

I made this simple SQL script to insert all the provinces of Canada. I'm posting it on here in case I need it in the future, and so anyone else that might find it useful can download it.

<!--more-->

```sql
CREATE TABLE IF NOT EXISTS provinces (
	`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	`name` VARCHAR(100),
	`abbrev` CHAR(2)
);

INSERT INTO provinces(`id`, `name`, `abbrev`)
VALUES(NULL, 'Alberta', 'AB');

INSERT INTO provinces(`id`, `name`, `abbrev`)
VALUES(NULL, 'British Columbia', 'BC');

INSERT INTO provinces(`id`, `name`, `abbrev`)
VALUES(NULL, 'Manitoba', 'MB');

INSERT INTO provinces(`id`, `name`, `abbrev`)
VALUES(NULL, 'New Brunswick', 'NB');

INSERT INTO provinces(`id`, `name`, `abbrev`)
VALUES(NULL, 'Newfoundland and Labrador', 'NL');

INSERT INTO provinces(`id`, `name`, `abbrev`)
VALUES(NULL, 'Northwest Territories', 'NT');

INSERT INTO provinces(`id`, `name`, `abbrev`)
VALUES(NULL, 'Nova Scotia', 'NS');

INSERT INTO provinces(`id`, `name`, `abbrev`)
VALUES(NULL, 'Nunavut', 'NU');

INSERT INTO provinces(`id`, `name`, `abbrev`)
VALUES(NULL, 'Ontario', 'ON');

INSERT INTO provinces(`id`, `name`, `abbrev`)
VALUES(NULL, 'Prince Edward Island', 'PE');

INSERT INTO provinces(`id`, `name`, `abbrev`)
VALUES(NULL, 'Quebec', 'QC');

INSERT INTO provinces(`id`, `name`, `abbrev`)
VALUES(NULL, 'Saskatchewan', 'SK');

INSERT INTO provinces(`id`, `name`, `abbrev`)
VALUES(NULL, 'Yukon', 'YT');
```

Or download it as a SQL script here: [canada_provinces.sql](/files/2012/01/canada_provinces.sql)<!--more-->

Please forward any spelling mistakes or errors to me, or just comment on this post.
