/// <reference path="./typings/node/node.d.ts"/>

var left = ["admiring", "adoring", "agitated", "angry", "backstabbing", "berserk", "boring", "clever", "cocky", "compassionate",
    "condescending", "cranky", "desperate", "determined","distracted", "dreamy","drunk", "ecstatic", "elated", "elegant",
    "evil", "fervent", "focused", "furious", "gloomy", "goofy", "grave", "happy", "high", "hopeful", "hungry", "insane", "jolly",
    "jovial", "kickass", "lonely", "loving", "mad", "modest", "naughty", "nostalgic", "pensive", "prickly", "reverent", "romantic",
    "sad", "serene", "sharp", "sick", "silly", "sleepy", "stoic", "stupefied", "suspicious", "tender", "thirsty", "trusting",]

var right = ['Bender', 'Fry', 'Leela', 'Farnsworth', 'Amy', 'Kif', 'Zapp', 'Hermes', 'Calculon',
    'Busgosu', 'Coco', 'Cuelebre', 'Dianu', 'Guercu', 'Lloberu', 'Nuberu', 'Papon', 'Pataricu', 'Pasadiellu',
    'Sumiciu', 'Tragu', 'Curuxa', 'Guaxa', 'Guestia', 'Zamparrampa', 'Bruxa', 'Xana','Espumeru']

export function generateName() {
    var rleft = Math.floor((Math.random() * left.length))
    var rright = Math.floor((Math.random() * right.length))
    return left[rleft]+"-"+right[rright]
}