+++
Description = ""
date = "2013-06-06 14:04:01+00:00"
title = "Timing PHP code using a simple stopwatch class"
slug = "timing-php-code-using-a-simple-stopwatch-class"
tags = ["projects", "code", "php", "perf"]

+++

If you're writing a performance-focused app, it's nice to be able to time how long various pieces of code take to execute. Below is the class I use (called `StopWatch`) and a really simple example of how I use it.<!--more-->

```php
<?php
class StopWatch {
  /**
   * @var $startTimes array The start times of the StopWatches
   */
  private static $startTimes = array();

  /**
   * Start the timer
   * 
   * @param $timerName string The name of the timer
   * @return void
   */
  public static function start($timerName = 'default') {
    self::$startTimes[$timerName] = microtime(true);
  }

  /**
   * Get the elapsed time in seconds
   * 
   * @param $timerName string The name of the timer to start
   * @return float The elapsed time since start() was called
   */
  public static function elapsed($timerName = 'default') {
    return microtime(true) - self::$startTimes[$timerName];
  }
}
```

Here's a silly example to time how long it takes to sleep for 2 seconds using `sleep(2)`.

```php
<?php
  // start the timer
  StopWatch::start();

  // sleep for 2 seconds
  sleep(2);

  // check how long 2 seconds is...
  echo "Elapsed time: " . StopWatch::elapsed() . " seconds";
```

When I run this on my local WAMP stack, I get `Elapsed time: 1.9999310970306 seconds`. The results vary, but they're all as close to 2 seconds as makes no difference.

A better example would be if you were sending a file to a remote location (such as Amazon S3) and you want to find out how long it takes.

```php
<?php
  // create a new S3 instance
  $s3 = new S3('my access key', 'my secret key');

  // start the timer
  StopWatch::start();

  // read & send the file
  $f = $s3->inputFile('file_to_upload.zip');
  $r = $s3->putObject($f, 'my-bucket-name', 'uploaded_file.zip', S3::ACL_PUBLIC_READ);

  // check the result of the operation
  if ($r !== false) {
      // check how long it took
      echo "Elapsed time: " . StopWatch::elapsed() . " seconds";
  } else {
      echo "S3 Error!";
  }
```

Note: This example uses the PHP S3 class from [https://github.com/tpyo/amazon-s3-php-class](https://github.com/tpyo/amazon-s3-php-class).

This would produce something more like `Elapsed time: 3.7492766736612 seconds` (depending on how big `file_to_upload.zip` is obviously. This little tool has come in useful for me a number of times, especially when trying to identify bottlenecks in systems that perform a large amount of juggling with complex data structures. You could add all kinds of other options to it as well, like defining what units to return (seconds, milliseconds, nanoseconds).
