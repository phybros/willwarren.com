CREATE TABLE IF NOT EXISTS provinces (
	`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	`name` VARCHAR(100),
	`abbrev` CHAR(2)
);

INSERT INTO provinces(`id`, `name`, `abbrev`) VALUES(NULL, 'Alberta', 'AB');
INSERT INTO provinces(`id`, `name`, `abbrev`) VALUES(NULL, 'British Columbia', 'BC');
INSERT INTO provinces(`id`, `name`, `abbrev`) VALUES(NULL, 'Manitoba', 'MB');
INSERT INTO provinces(`id`, `name`, `abbrev`) VALUES(NULL, 'New Brunswick', 'NB');
INSERT INTO provinces(`id`, `name`, `abbrev`) VALUES(NULL, 'Newfoundland and Labrador', 'NL');
INSERT INTO provinces(`id`, `name`, `abbrev`) VALUES(NULL, 'Northwest Territories', 'NT');
INSERT INTO provinces(`id`, `name`, `abbrev`) VALUES(NULL, 'Nova Scotia', 'NS');
INSERT INTO provinces(`id`, `name`, `abbrev`) VALUES(NULL, 'Nunavut', 'NU');
INSERT INTO provinces(`id`, `name`, `abbrev`) VALUES(NULL, 'Ontario', 'ON');
INSERT INTO provinces(`id`, `name`, `abbrev`) VALUES(NULL, 'Prince Edward Island', 'PE');
INSERT INTO provinces(`id`, `name`, `abbrev`) VALUES(NULL, 'Quebec', 'QC');
INSERT INTO provinces(`id`, `name`, `abbrev`) VALUES(NULL, 'Saskatchewan', 'SK');
INSERT INTO provinces(`id`, `name`, `abbrev`) VALUES(NULL, 'Yukon', 'YT');
