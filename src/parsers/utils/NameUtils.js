// Basically a copy of 'Teselagen.utils.NameUtils' for use within workers.

export default {
	/**
	 * Reformat name to replaces whitespace with underscores.
	 * @param  pName
	 * @returns  New name.
	 */
	reformatName: function(pName) {
		return pName.toString().replace(/ /g, '_');
	},
};

