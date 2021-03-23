---
title: "Placevalue"
date: 2021-03-23T10:51:41-05:00
tags: ['programming']
draft: false
---
I'm on vacation this week and I've been familiarizing myself with Swift, as I get into the phase of a personal side project of mine for an iOS app. I'm always interested in new languages, especially when those languages were created specifically to solve a particular problem. It's interesting to me to consider how this language differs from prevous languages used in this particular problem space - much like C# clearly took a lot of inspiration from Java and C++, while fixing various issues in those languages with the benefit of hindsight, what problems is Swift solving?

I'm still getting oriented on the language, but one thing I like to do is to give myself little coding challenges. I decided to write a decimal place value descriptor. You specify a number, and it prints out the number of tens, thousands, hundreds, etc. your number contains, much like you would have a child do when learning decimal place value in elementary school.

It's not particularly complicated.

```
import Foundation

var num = 3_112_310_517;

let names = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"]
let places = ["Ones", "Tens", "Hundreds", "Thousands", "Ten Thousands", "Hundred Thousands", "Millions", "Ten Millions", "Hundred Millions", "Billions"]

var remaining = num;
var divisor = 1;
var place = 0;

repeat {
    let leftover = remaining % divisor
    let result = remaining / divisor
    
    if (result < 10 ) {
        let val = result != 0 ? result : leftover

        print("\(names[val]) \(places[place])")
        remaining = remaining - (divisor * val)

        divisor = 1
        place = 0
    } else {
        divisor *= 10
        place += 1
    }
} while (remaining > 0)
```

There migt be a better approach than an increasing divisor. I could also defer the remainder calculation until the result is less than ten.

When the above is run, the following output is generated:

```
Three Billions
One Hundred Millions
One Ten Millions
Two Millions
Three Hundred Thousands
One Ten Thousands
Five Hundreds
One Tens
Seven Ones
```
