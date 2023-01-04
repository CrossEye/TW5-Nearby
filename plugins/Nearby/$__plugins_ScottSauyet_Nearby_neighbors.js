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

const points = {
    tagged: 8,
    linked: 5,
    sharedTag: 3,
    hasField: 1
}

const distance = function (wiki, first, second) {
    const a = wiki.getTiddler (first) ?? {fields: {}}
    const b = wiki.getTiddler (second) ?? {fields: {}}
    const linked = wiki.getTiddlerLinks(first).includes(second) || wiki.getTiddlerLinks(second).includes (first)
    const tagsA = a.getFieldList('tags')
    const tagsB = b.getFieldList('tags')
    const tagged = tagsA.includes (second) || tagsB.includes (first)
    const sharedTag = intersect (tagsA, tagsB) . length > 0
    const fieldsA = Object .values(fields (a)) .flat()
    const fieldsB = Object .values(fields (b)) .flat ()
    const hasField = fieldsA .includes (second) || fieldsB .includes (first)
    const rawScore = 
        (tagged ? points.tagged : 0) +
        (linked ? points.linked : 0) +
        (sharedTag ? points.sharedTag : 0) +
        (hasField ? points.hasField : 0)
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