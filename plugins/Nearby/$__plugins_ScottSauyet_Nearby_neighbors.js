/*\
title: $:/core/modules/filters/neighbors.js
type: application/javascript
module-type: filteroperator

List the `n` nearest neighbors for a tiddler

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";


const intersect = (as, bs) => 
  as .filter (a => bs .includes (a))


const fields = (tiddler) => Object .fromEntries ( // TODO: Very roundabout.  Surely something better available
  Object .entries (tiddler .getFieldStrings()) 
  .filter (([k]) => ! ['created', 'modified', 'revision', 'tags', 'text', 'title', 'type', 'list'] .includes (k))
  .map (([k, v]) => [k, tiddler.getFieldList(k)])
)

const defaultPoints = {
    tagged: 8,
    linked: 5,
    sharedTag: 3,
    hasField: 1
}

const sum = (ns) => ns .reduce ((t, n) => t + n, 0)

const score = (parts, points) => sum(
  Object.entries(parts).map(([k, v]) => {
    const ps = points[k] || [0]
    const dflt = ps .at (-1) || 0
    return sum(Array.from({length: v}, (_, i) => ps [i] || dflt))
  })
)

const distance = function (wiki, first, second) {
    // TODO (once real config in place): add error handling
    console .log ({conf: wiki.getTiddler('$:/plugins/ScottSauyet/Nearby/config.json')});
    const points = JSON.parse(wiki.getTiddler('$:/plugins/ScottSauyet/Nearby/config.json').fields.text)
        || defaultPoints
    const a = wiki.getTiddler (first) ?? {fields: {}}
    const b = wiki.getTiddler (second) ?? {fields: {}}
    const linked = wiki.getTiddlerLinks(first).includes(second) || wiki.getTiddlerLinks(second).includes (first) ? 1 : 0
    const tagsA = a.getFieldList('tags')
    const tagsB = b.getFieldList('tags')
    const tagged = tagsA.includes (second) || tagsB.includes (first) ? 1 : 0
    const sharedTag = intersect (tagsA, tagsB) . length
    const fieldsA = Object.values(fields (a)).flat()
    const fieldsB = Object.values(fields (b)).flat()
    const hasField = fieldsA.filter(x => x == second).length +
                     fieldsB.filter(y => y == first).length
    const rawScore = score ({linked, tagged, sharedTag, hasField}, points)
    return first == second ? 0 : rawScore == 0 ? Infinity : ~~(1000 / rawScore)

}

exports.neighbors = function(source,operator,options) {
	const titles = options.wiki.getTiddlers() .filter (t => ! t.startsWith ('$:/'))
	let results = []
	source(function(tiddler,title) { // todo: can this operate on more than one?  Here it's the last input tiddler
		results = titles 
		  .map (t => [t, distance(options.wiki, title, t)]) 
		  .filter (([_, v]) => v !== 0 && v !== Infinity)
		  .sort (([, a], [, b]) => a - b) 
		  .slice (0, operator .operand ? Number (operator .operand) : Infinity)
		  .map (([t]) => t
		)
	});
	return results
};

})();