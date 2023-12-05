+++
date = 2012-01-24
title = "Creating a public API with Apache Thrift"
slug = "creating-a-public-api-with-apache-thrift"
tags = ["coding", "projects", "php", "python"]

+++

I recently came across a new client-server technology that really fascinated me. Through my meddlings with CirrusNote, I know that 49% of the effort of writing a good API is coming up with standards (XML formats, rules, schemas etc.), 49% is writing boilerplate code (XML parsing, schema validation etc. etc.) and the other 2% is spent actually writing interesting code like database interaction and cool client-side stuff.

## What is Apache Thrift?

> Thrift is a software framework for scalable cross-language services development. It combines a software stack with a code generation engine to build services that work efficiently and seamlessly between C++, Java, Python, PHP, Ruby, Erlang, Perl, Haskell, C#, Cocoa, JavaScript, Node.js, Smalltalk, and OCaml. - From the Apache Thrift website.

That sounds great. Reading the documentation (if you can find it) and browsing through the tutorials made me even more excited about Thrift. Some of the testimonials were also pretty inspiring (Evernote, Last.fm, Facebook (who actually invented Thrift) to name a few).
<!--more-->

## How does it work?

If you're familiar with the concept of Interfaces in obejct-oriented programming, then you'll have a pretty good grasp of how Thrift works already. The idea goes like this:
	
1. Define your object types, constants, enums, services and methods in a special .thrift file
2. Let thrift generate the server _and_ client code for you
3. You're done.

Holy crap, I just gained 98% of my time back by not having to spend ages fixing stupid null pointer exceptions that are buried somewhere deep inside my XML parsing logic.

Okay, so I simplified it a little bit, however Thrift _does_ do all of the heavy lifting for you leaving you free to concentrate on writing _actual code_ instead of boring boilerplate junk.

Once you have completed step 2, you will be left with function stubs on the server side, allowing you to just fill in the blanks. On the client side, you will be left with an awesome, super-easy to use library that talks to your server seamlessly. When I say seamlessly I mean _seamlessly_. It's as if you're just calling methods inside some other class in your app.

The way I like to describe it is this: **Thrift allows you to completely ignore the fact that the client and server are separated by the internet.**

## Getting down to code

To demonstrate the awesome power of Thrift, I'm going to implement a simple service on my web server (using PHP). Then I'll show how to interact with that server from a basic client written in Python.

**Note:** A very basic knowledge of Thrift is useful to read/do this tutorial (i.e. read [this](http://wiki.apache.org/thrift/ThriftFeatures), [this](http://wiki.apache.org/thrift/ThriftTypes) and [this](http://wiki.apache.org/thrift/FAQ))

### The Hello Service

The example I will use is a very simple service that just says Hello World in a few different ways.

First things first, we need to create a simple **enum** and a ** service**. Open up a new file and call it `Hello.thrift`

```c
enum HelloLanguage {
        ENGLISH,
        FRENCH,
        SPANISH
}

service HelloService {
        string say_hello(),
        string say_foreign_hello(1: HelloLanguage language),
        list<string> say_hello_repeat(1: i32 times),
}
```

FUN FACT: When Thrift generates your code for you, **structs** are typically translated into [classes](http://en.wikipedia.org/wiki/Class_(programming)), **enums** are usually translated into [enumerated types](http://en.wikipedia.org/wiki/Enumerated_type) and **services** are translated into [interfaces](http://en.wikipedia.org/wiki/Interface_(computing)).

Our new service interface describes 3 simple methods:

* `say_hello` - this method will just return "Hello World!"
* `say_foreign_hello` - this method will take a HelloLanguage and return a "Hello World!" in the appropriate language.	
* `say_hello_repeat` - this method will take an integer value and return a list of strings. The number of strings will depend on what you pass in.

For now, we're done editing our thrift file. Honestly, that's about 75% of the work done for creating a new API. Exciting stuff.


## Generating the code


Now, we're going to use thrift to generate the server code for us:

```bash
thrift --gen php:server Hello.thrift
```

Running the thrift code generator leaves us with a gen-php directory, which in turn contains all of the generated code. Because I specified the `:server` modifier on the thrift command, it also generated method stubs for our new service.

The code generator generates an [interface](http://en.wikipedia.org/wiki/Interface_(computing)). All we have to do to make the service work, is implement the interface, and override the methods.

In your web root, create an `index.php` with the following code in it:

```php
<?php
$GLOBALS['THRIFT_ROOT'] = 'lib/php/src';

require_once $GLOBALS['THRIFT_ROOT'] . '/Thrift.php';
require_once $GLOBALS['THRIFT_ROOT'] . '/protocol/TBinaryProtocol.php';
require_once $GLOBALS['THRIFT_ROOT'] . '/transport/TPhpStream.php';
require_once $GLOBALS['THRIFT_ROOT'] . '/transport/TBufferedTransport.php';
require_once $GLOBALS['THRIFT_ROOT'] . '/transport/TFramedTransport.php';

$GEN_DIR = 'gen-php';

require_once $GEN_DIR . '/Hello/HelloService.php';

class HelloServiceImpl implements HelloServiceIf {
        public function say_foreign_hello($language) {
                switch($language) {
                        case HelloLanguage::ENGLISH:
                                return "Hello World!";
                        break;
                        case HelloLanguage::FRENCH:
                                return "Bonjour tout le monde!";
                        break;
                        case HelloLanguage::SPANISH:
                                return "Hola Mundo!";
                        break;
                        default:
                                return "You didn't specify a valid language!";
                        break;
                }
        }
        public function say_hello_repeat($times) {
                $hellos = array();
                for($i=0;$i<$times;$i++) {
                        $hellos[] = "$i Hello World!";
                }
                return $hellos;
        }

        public function say_hello() {
                return "Hello World!!!!!!!!";
        }
}

header('Content-Type', 'application/x-thrift');

$handler   = new HelloServiceImpl();
$processor = new HelloServiceProcessor($handler);

$transport = new TBufferedTransport(new TPhpStream(TPhpStream::MODE_R | TPhpStream::MODE_W));

$protocol = new TBinaryProtocol($transport, true, true);

$transport->open();
$processor->process($protocol, $protocol);
$transport->close();
```

Now we have a fully functioning `HelloService` implementation on our web server. Looking at the code you can see that I filled in the 3 methods I described earlier to produce the expected results.

## Writing the Client

Our `HelloService` implementation is up and running, now we have to create a client to interact with it. I'm going to demonstrate in Python because it requires the least effort to get it going. I created a file called `client.py` and filled it with the following contents:

```python
#!/usr/bin/env python

import sys
sys.path.append('gen-py/Hello')
import HelloService
from ttypes import *
from thrift import Thrift
from thrift.transport import TTransport
from thrift.transport import THttpClient
from thrift.protocol import TBinaryProtocol

try:
    host = "localhost"
    port = "80"
    uri = "/thrift/hello"

    transport = THttpClient.THttpClient(host, port, uri)
    transport = TTransport.TBufferedTransport(transport)
    protocol = TBinaryProtocol.TBinaryProtocol(transport)

    # create a new HelloService client
    client = HelloService.Client(protocol)

    # connect to the service
    transport.open()

    e = client.say_hello()
    print "say_hello() = %s" % e

    e = client.say_foreign_hello(HelloLanguage.SPANISH)
    print "say_foreign_hello(HelloLanguage.SPANISH) = %s" % e

    e = client.say_hello_repeat(10)
    print "say_hello_repeat(10) = %s" % e

    # close the connection
    transport.close()

# catch any errors
except Thrift.TException, tx:
        print "ERROR: %s" % (tx.message)
```

Using your service is as simple as creating a new client object, and calling the desired method. To run the client, we just execute the file and the following output is produced:

```bash
    ~/thrift/hello$ ./client.py
    say_hello() = Hello World!!!!!!!!
    say_foreign_hello(HelloLanguage.SPANISH) = Hola Mundo!
    say_hello_repeat(10) = ['0 Hello World!', '1 Hello World!', '2 Hello World!', '3 Hello World!', '4 Hello World!', '5 Hello World!', '6 Hello World!', '7 Hello World!', '8 Hello World!', '9 Hello World!']
```

You can see that the first 2 methods just returned strings, and the third returned a list with 10 strings in it (because we specified 10 in the method call).

## Conclusion

The HelloService is an extremely simple example, but it demonstrates how easy it is to call remote functions from a simple client with very little coding required. I barely scratched the surface of what Thrift is capable of. To see an example of a very complex thrift service definition, I suggest you check out [the Evernote API reference](http://www.evernote.com/about/developer/api/ref/). They make full use of namespacing, custom types, complex structs and so on.

Thrift makes cross-platform development very simple as well. Want to create a HelloService android app? Just run the thrift code generator to generate the Java code, and now you have access to all the service methods and types in your app. Want to write a Mac OS X client? Just generate the cocoa code and you're able to call your services really easily with very little effort.


## Further reading

* Apache Thrift Wiki - [http://wiki.apache.org/thrift/](http://wiki.apache.org/thrift/)
* How to design a good API and why it matters (PDF) - [http://lcsd05.cs.tamu.edu/slides/keynote.pdf](http://lcsd05.cs.tamu.edu/slides/keynote.pdf)
* Evernote API: All Thrift declarations - [http://www.evernote.com/about/developer/api/ref/](http://www.evernote.com/about/developer/api/ref/)
* Apache Thrift: The missing guide - [http://diwakergupta.github.com/thrift-missing-guide/thrift.pdf](http://diwakergupta.github.com/thrift-missing-guide/thrift.pdf)
