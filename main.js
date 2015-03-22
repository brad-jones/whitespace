/*
 * Copyright (c) 2015 Brad Jones
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

define(function (require, exports, module)
{
	// Import some modules
	var
		Commands        = brackets.getModule('command/Commands'),
		CommandManager  = brackets.getModule('command/CommandManager'),
		DocumentManager = brackets.getModule('document/DocumentManager'),
		Editor          = brackets.getModule('editor/Editor').Editor
	;
	
	// Define some constants
	var
		HUMAN_NAME = 'Whitespace My Way',
		COMP_NAME = 'brad-jones.whitespace'
	;
	
	// Attach some events
	$(DocumentManager).on('documentSaved', normaliseWhitespace);
	$(DocumentManager).on('documentRefreshed', normaliseWhitespace);
	
	/**
	 * Given a document, we will search for all leading whitespace,
	 * detroy that whitespace and replace it with the type of
	 * indentation currently set in Brackets.
	 *
	 * Trailing whitespace is also detroyed.
	 *
	 * Whitespace on empty lines are left in tact though.
	 *
	 * And a new line will also be added to the end of the file.
	 *
	 * @param {Object} event
	 * @param {Object} doc
	 */
	function normaliseWhitespace(event, doc)
	{
		doc.batchOperation(function()
		{
			var line, pattern, match;
			var lineIndex = 0, wsPattern = getReplacePattern(Editor);
			
			while ((line = doc.getLine(lineIndex)) !== undefined)
			{
				// Trim trailing whitespaces
				pattern = /[ \t]+$/g; match = pattern.exec(line);
				if (match)
				{
					// Only remove trailing whitespace if the line contains
					// other content. Empty lines will be left as is.
					if (match.input.replace(/^\s+|\s+$/g, '').length > 0)
					{
						doc.replaceRange
						(
							'',
							{line: lineIndex, ch: match.index},
							{line: lineIndex, ch: pattern.lastIndex}
						);
					}
				}
				
				// Replace leading whitespace
				match = wsPattern.sanitizeLine(line);
				if (match.replaceWith)
				{
					doc.replaceRange
					(
						match.replaceWith,
						{line: lineIndex, ch: match.start},
						{line: lineIndex, ch: match.end}
					);
				}
				
				// Advance to the next line of the document
				lineIndex += 1;
			}
			
			// Ensure newline at the end of file
			line = doc.getLine(lineIndex - 1);
			if (line !== undefined && line.length > 0 && line.slice(-1) !== '\n')
			{
				doc.replaceRange('\n', {line: lineIndex, ch: line.slice(-1)});
			}
		});
		
		// Save the modified file
		CommandManager.execute(Commands.FILE_SAVE, {doc: doc});
	}
	
	/**
	 * Defines the Regular Expression based on what
	 * indentation settings are set in Brackets.
	 *
	 * @param   {Object} editor
	 * @returns {Object}
	 */
	function getReplacePattern(editor)
	{
		var pattern = editor.getUseTabChar() ? {
			units: editor.getTabSize(),
			matchPattern: /^[ ]+/g,
			replaceWith: '\t',
			getIndent: function(length) {
				return Math.round(length / pattern.units);
			}
		}: {
			units: editor.getSpaceUnits(),
			matchPattern: /^[\t]+/g,
			replaceWith: ' ',
			getIndent: function(length) {
				return length * pattern.units;
			}
		};
		
		function sanitizeLine(line)
		{
			var regMatch = line.match(pattern.matchPattern);
			var matches  = (regMatch || [''])[0];
			var indent   = pattern.getIndent(matches.length);
			
			return {
				replaceWith: new Array(indent + 1).join(pattern.replaceWith),
				start: 0,
				end: matches.length
			};
		}
		
		return {
			sanitizeLine: sanitizeLine
		};
	}
});
