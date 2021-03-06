/*	*************************************************************************************************
 *	Created by Andrea Budac at the University of Alberta
 *	Created under the INKE project and Dr. Rockwell and Dr. Ruecker
 *	Original idea by Robert Budac
 *	Contributors: Andrea Budac, Geoffrey Rockwell, Zachary Palmer, Robert Budac, Stan Ruecker
 *	*************************************************************************************************
 *	WIkcer (Wikipedia Idea Scraper) is a tool for scraping old revisions of Wikipedia articles.
 *	The corpus resulting from the scrape is then available to the user to analyze as they see fit.
 *	
 *	Copyright (C) 2014-2015  Andrea Budac and INKE
 *	
 *	This program is free software: you can redistribute it and/or modify
 *	it under the terms of the GNU General Public License as published by
 *	the Free Software Foundation, either version 3 of the License, or
 *	(at your option) any later version.
 *	
 *	This program is distributed in the hope that it will be useful,
 *	but WITHOUT ANY WARRANTY; without even the implied warranty of
 *	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *	GNU General Public License for more details.
 *	
 *	You should have received a copy of the GNU General Public License
 *	along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *	*************************************************************************************************
 */

/*
 *	Load Datepickers, slide panels and popovers when ready
 *	Reset forms for editing
 */
$(document).ready(function () {
	//Re-enable any disabled form elements and disable submit button
	enableForm();

	document.getElementById('resetButton').disabled = false;

	// Reset the form
	document.getElementById("wikiForm").reset();

	// Empty the output section
	document.getElementById('printOutHere').innerHTML = '';
	// Disable the select output text button
	document.getElementById('selectTextButton').disabled = true;

	// Reset preview to Wikipedia main page
	document.getElementById('previewFrame').src = document.getElementById("wikiAddress").placeholder;

	// Reset all error messages
	document.getElementById("wikiAddressBox").className = "form-group";
	document.getElementById("startDateBox").className = "form-group";
	document.getElementById("endDateBox").className = "form-group";

	/*	
	 *	Initialize datepickers with proper date format, initial view of the current year,
	 *	make them hide on selection, don't forcibly parse the user's input, and add a clear button to the bottom
	 *	Wikipedia started on January 15, 2001, so restrict start date to this day
	 *	"+0d" prevents users from selecting days after today
	 *	Also validate the given info when the date is changed or the datepicker is hidden
	 */ 
	$('#startDate').datepicker( {
		format: "yyyy/mm/dd",
		startView: "year",
		autoclose: true,
		forceParse: false,
		clearBtn: true,
		endDate: "+0d",
		startDate: "2001/01/15"
	}).on('changeDate', function(e){
		validateInfo();
	}).on('hide', function(e){
		validateInfo();
	});

	$('#endDate').datepicker( {
		format: "yyyy/mm/dd",
		startView: "year",
		autoclose: true,
		forceParse: false,
		clearBtn: true,
		endDate: "+0d",
		startDate: "2001/01/15"
	}).on('changeDate', function(e){
		validateInfo();
	}).on('hide', function(e){
		validateInfo();
	});

	// Initialize slide panels with custom transition time
	$("#aboutInfo").click( function() {
		$("#aboutPanel").slideToggle(460);
		$("#helpPanel").slideUp(460);
	});
	$("#helpInfo").click( function() {
		$("#helpPanel").slideToggle(460);
		$("#aboutPanel").slideUp(460);
	});

	// Inititalize popovers with no content
	$('#wikiAddress').popover( {
		placement: "right",
		trigger: "focus hover",
		container: "body"
	});
	$('#startDate').popover( {
		placement: "right",
		trigger: "focus hover",
		container: "body"
	});
	$('#endDate').popover( {
		placement: "right",
		trigger: "focus hover",
		container: "body"
	});
});


/*
 *	Function that closes the error alert (id="errorOutputAlert") when the x button is pressed
 *	Allows the same alert to be used for all of the errors
 */
$(function() {
	$(document).on('click', '.alert-close', function() {
		$(this).parent().slideUp(460);
	})
});


/*
 *	When the submit button (id = submitButton) is clicked
 *	grab all the given info
 *	concat the address and parse
 */
function wikiScrapeGo()
{
	// check if info is valid
	if ( !(validateInfo()) ) {
		sendError("Data entered is not valid.");
		return;
	}

	// Grab the dates and interval data
	var getStartDate = document.getElementById("startDate").value;
	var getEndDate = document.getElementById("endDate").value;
	var getIntervalDate = document.getElementById("oftenDate").value;
	// Grab the full Address
	var getAddress = document.getElementById("wikiAddress").value;

	// Disable the form to prevent retreival errors
	disableForm();
	// Reset the progress bar to 0%
	document.getElementById("progressBar").style.width = "0%";
	// Show the progress bar
	$("#progressBarWrapper").slideDown(460);

	// Given a string in the format: 2014/11/26, parse and store as a date object
	// Subtract 1 off of month, since month counting starts at zero
	var startDateObj = new Date( getStartDate.substring(0, 4),
			(getStartDate.substring(5, 7) - 1), getStartDate.substring(8, 10) );
	var endDateObj = new Date( getEndDate.substring(0, 4),
			(getEndDate.substring(5, 7) - 1), getEndDate.substring(8, 10) );

	// Parse the wikiAddresses together
	var fullWikiAddress = parseInitialAddress( getAddress, getStartDate, getEndDate);
	var findFirstWikiAddress = findFirstRevision( getAddress);
	var findLastWikiAddress = findLastRevision( getAddress);

	// Get JSON object from given data: Find the first revision for the given article
	$.getJSON( findFirstWikiAddress).then( function(data)
		{
			// Check if the data we expect exists
			if (data && data.query && data.query.pages) {
				// Cut through the nested json object
				var pages = data.query.pages;
			}
			else {
				// ERROR. No pages returned.
				sendError("Wikipedia article was not found the first time.");
			}
			// Loop over the one property of data.query.pages
			for (var id in pages)
			{
				if (pages[id].revisions && pages[id].revisions[0] && pages[id].revisions[0]["revid"])
				{
					var firstRevisionId = pages[id].revisions[0]["revid"];

					// Change the timestamp of the first revision to date format
					// Given a string in the format: 2014-11-26..., parse and store as a date object
					var firstRevisionDate = new Date( pages[id].revisions[0]["timestamp"].substring(0, 4),
								(pages[id].revisions[0]["timestamp"].substring(5, 7) - 1),
									pages[id].revisions[0]["timestamp"].substring(8, 10) );

					// Check if user entered a start date before article existed
					if (firstRevisionDate >= startDateObj)
					{
						/*	If article creation is after selected start date, then the first revision is the first one we want */
						// Empty array for storing results
						var contentArray = new Array();
						// Fill array with initial revision: Get timestamp and content of current revision
						contentArray.push(pages[id].revisions[0]["timestamp"]);
						contentArray.push(pages[id].revisions[0]["user"]);
						contentArray.push(pages[id].revisions[0]["*"]);

						// Calculate the next interval of time: Get the total miliseconds of the start date
						var startMiliSec = Date.parse(startDateObj);
						// Use those to calculate the next time we want to grab a revision
						startMiliSec = startMiliSec + getMiliseconds(getIntervalDate);
						var calcDate = new Date();
						calcDate.setTime(startMiliSec);

						// Go to recursive funtion with initial data
						findNextRevision( firstRevisionId, getIntervalDate, getAddress, calcDate, endDateObj, contentArray);
					}
					else {
						/*	
						 *	If article creation is before selected start date, then the first
						 *	revision is either a specific revision, or the last one
						 */
						// Get JSON object from given data: Find the last revision for the given article
						$.getJSON( findLastWikiAddress).then( function(data)
							{
								// Check if the data we expect exists
								if (data && data.query && data.query.pages) {
									// Cut through the nested json object
									var pages = data.query.pages;
								}
								else {
									// ERROR. No pages returned.
									sendError("Wikipedia article was not found a second time.");
								}
								// Loop over the one property of data.query.pages
								for (var id in pages)
								{
									if (pages[id].revisions && pages[id].revisions[0] && pages[id].revisions[0]["revid"])
									{
										var lastRevisionId = pages[id].revisions[0]["revid"];

										// Change the timestamp of the last revision to date format
										// Given a string in the format: 2014-11-26..., parse and store as a date object
										var lastRevisionDate = new Date( pages[id].revisions[0]["timestamp"].substring(0, 4),
													(pages[id].revisions[0]["timestamp"].substring(5, 7) - 1),
														pages[id].revisions[0]["timestamp"].substring(8, 10) );

										// Check if user entered a start date after the last revision
										if (startDateObj >= lastRevisionDate)
										{
											/*	If last revision occured before selected start date, the last revision is the one we want */
											// Empty array for storing results
											var contentArray = new Array();
											// Fill array with initial revision: Get timestamp and content of current revision
											contentArray.push(pages[id].revisions[0]["timestamp"]);
											contentArray.push(pages[id].revisions[0]["user"]);
											contentArray.push(pages[id].revisions[0]["*"]);

											// Calculate the next interval of time: Get the total miliseconds of the start date
											var startMiliSec = Date.parse(startDateObj);
											// Use those to calculate the next time we want to grab a revision
											startMiliSec = startMiliSec + getMiliseconds(getIntervalDate);
											var calcDate = new Date();
											calcDate.setTime(startMiliSec);

											// Go to recursive funtion with initial data
											findNextRevision( lastRevisionId, getIntervalDate, getAddress, calcDate, endDateObj, contentArray);
										}
										else {
											/*	
											 *	If last article revision is after selected start date, then the first
											 *	revision is a specific revision
											 */
											// Get JSON object from given data
											$.getJSON( fullWikiAddress).then( function(data)
												{
													// Check if the data we expect exists
													if (data && data.query && data.query.pages) {
														// Cut through the nested json object
														var pages = data.query.pages;
													}
													else {
														// ERROR. No pages returned.
														sendError("Wikipedia article was not found.");
													}
													// Loop over the one property of data.query.pages
													for (var id in pages)
													{
														if (pages[id].revisions && pages[id].revisions[0] && pages[id].revisions[0]["revid"])
														{
															/*	If the first revision after the start time has a parent,
															 *	use that revision as the "first"
															 */
															if( pages[id].revisions[0]["parentid"] != 0)
															{
																var revIdFirst = pages[id].revisions[0]["parentid"];
																// Empty array for storing results
																var contentArray = new Array();

																// Go to recursive funtion with initial data
																findNextRevision( revIdFirst, getIntervalDate, getAddress, startDateObj,
																		endDateObj, contentArray);
															}
															else {
																var revIdFirst = pages[id].revisions[0]["revid"];
																// Empty array for storing results
																var contentArray = new Array();
																// Fill array with initial revision: Get timestamp and content of current revision
																contentArray.push(pages[id].revisions[0]["timestamp"]);
																contentArray.push(pages[id].revisions[0]["user"]);
																contentArray.push(pages[id].revisions[0]["*"]);

																// Calculate the next interval of time: Get the total miliseconds of the start date
																var startMiliSec = Date.parse(startDateObj);
																// Use those to calculate the next time we want to grab a revision
																startMiliSec = startMiliSec + getMiliseconds(getIntervalDate);
																var calcDate = new Date();
																calcDate.setTime(startMiliSec);

																// Go to recursive funtion with initial data
																findNextRevision( revIdFirst, getIntervalDate, getAddress, calcDate,
																		endDateObj, contentArray);
															}
														}
														else {
															// ERROR. No revision content returned.
															sendError("No revisions were found.");
														}
													}
												}
											);
										}
									}
									else {
										// ERROR. No revision content returned.
										sendError("No final revisions were found.");
									}
								}
							}
						);
					}
				}
				else {
					// ERROR. No revision content returned.
					sendError("No early revisions were found.");
				}
			}
		}
	);
}


/*
 *	Called from wikiScrapeGo()
 *	Recursively find the next revision after the one given that satisfies the given interval of time
 *	Finds all the revisions and places them into an array
 */
function findNextRevision( revisionId, intervalDate, gottenAddress, calcDate, endDate, contentArray)
{
	// Progress bar update
	updateProgressBar(calcDate, endDate);

	// Parse the wikiAddress together
	wikiAddress = parseAddress(gottenAddress, revisionId);

	// Get JSON object from given data
	$.getJSON( wikiAddress).then( function(data)
		{
			// Variable to store last stored revision id
			var lastRevId = revisionId;

			// Check if the data we expect exists
			if (data && data.query && data.query.pages) {
				// Cut through the nested json object
				var pages = data.query.pages;
			}
			else {
				// ERROR. No pages returned.
				sendError("Wikipedia article was not found the third time.");
			}
			// Loop over the one property of data.query.pages
			for (var id in pages)
			{
				if (pages[id].revisions && pages[id].revisions[0] && pages[id].revisions[0]["*"])
				{
					// Loop through the json object to find the next revisions
					for( var i = 0; i < pages[id].revisions.length; i++)
					{
						//sendError("30%: " + pages[id].revisions.length + " : " + i);
						if (pages[id].revisions && pages[id].revisions[i +1] && pages[id].revisions[i +1]["*"])
						{
							// Change the timestamp of the revision that is after the current one to date format
							// Given a string in the format: 2014-11-26..., parse and store as a date object
							var revisionDate = new Date( pages[id].revisions[i +1]["timestamp"].substring(0, 4),
										(pages[id].revisions[i +1]["timestamp"].substring(5, 7) - 1),
											pages[id].revisions[i +1]["timestamp"].substring(8, 10) );

							// While the date of the next revision is after the calculated date
							while(revisionDate > calcDate)
							{
								// Store the current revision
								contentArray.push(pages[id].revisions[i]["timestamp"]);
								contentArray.push(pages[id].revisions[i]["user"]);
								contentArray.push(pages[id].revisions[i]["*"]);

								// Store the revison id as the last chosen revison id
								lastRevId = pages[id].revisions[i]["revid"];

								// re-calculate calcDate for next interval
								var startMiliSec = Date.parse(calcDate) + getMiliseconds(intervalDate);
								calcDate.setTime(startMiliSec);

								// If past endDate, return.
								if( endDate < calcDate)
								{
									finalContent(contentArray, gottenAddress);
									return;
								}
							}
						}
						// If the current revision is the last revision and only revision
						else if (pages[id].revisions && pages[id].revisions[i] &&
									pages[id].revisions[i]["*"] && (pages[id].revisions.length == 1) ) 
						{
							// Change the timestamp of the revision that is currently being looked at to date format
							// Given a string in the format: 2014-11-26..., parse and store as a date object
							var revisionDate = new Date( pages[id].revisions[i]["timestamp"].substring(0, 4),
										(pages[id].revisions[i]["timestamp"].substring(5, 7) - 1),
											pages[id].revisions[i]["timestamp"].substring(8, 10) );

							// While the date of the current/last revision is before the calculated date: go forever until calcDate passes endDate
							while(endDate >= calcDate)
							{
								// Store the current revision
								contentArray.push(pages[id].revisions[i]["timestamp"]);
								contentArray.push(pages[id].revisions[i]["user"]);
								contentArray.push(pages[id].revisions[i]["*"]);

								// Store the revison id as the last chosen revison id
								lastRevId = pages[id].revisions[i]["revid"];

								// re-calculate calcDate for next interval
								var startMiliSec = Date.parse(calcDate) + getMiliseconds(intervalDate);
								calcDate.setTime(startMiliSec);
							}
							// If past endDate, return.
							if( endDate < calcDate)
							{
								finalContent(contentArray, gottenAddress);
								return;
							}
						}
						// If the current revision is the last revision of the json object
						else if ( (pages[id].revisions.length -1) == i)
						{
							// Store the revison id as the last chosen revison id
							lastRevId = pages[id].revisions[i]["revid"];
							// Do a recursive call and merge with content array starting with last revision id
							findNextRevision( lastRevId, intervalDate, gottenAddress, calcDate, endDate, contentArray);
						}
					}
				}
				else {
					// ERROR. No revision content returned.
					sendError("Recursive look for revisions could not find any.");
				}
				// If out of revisions but not time interval do a recursive call and merge with content array
				findNextRevision( lastRevId, intervalDate, gottenAddress, calcDate, endDate, contentArray);
			}
		}
	);
}


/*
 *	Called from addXML or makeHumanReadable when adding body text from contentArray
 *	Parse the output before appending to final string
 */
function parseString( wikiContent)
{
	// Clean up string of Wikipedia revisions
	// To preserve quotes, remove {{cquote|
	var parsedContent = wikiContent.replace(/\{+cquote\|/g, '');
	// Remove all text between {{ and }}
	parsedContent = parsedContent.replace(/\{+[^}]+\}+/g, '');	
	// Remove all text between [[ and |
	parsedContent = parsedContent.replace(/\[+([^\]]+)\|+/g, '');
	// Remove final infobox text between | and }}
	parsedContent = parsedContent.replace(/\|+([^\{\}]+)\}+/g, '');
	// Remove text between < and >
	parsedContent = parsedContent.replace(/<+([^<>]+)>+/g, '');
	// Remove &nbsp; and replace it with a standard space
	parsedContent = parsedContent.replace(/&nbsp;/g, ' ');
	// Remove two or more single quotes in a line
	parsedContent = parsedContent.replace(/\'\'+/g, '');
	// Remove all instances of "[["
	parsedContent = parsedContent.replace(/\[\[+/g, '');
	// Remove all instances of "]]"
	parsedContent = parsedContent.replace(/\]\]+/g, '');
	// Remove all instances of "}}"
	parsedContent = parsedContent.replace(/\}\}+/g, '');
	// Replace & with "and" to prevent xml errors
	parsedContent = parsedContent.replace(/\&/g, 'and');
	// Remove all instances of < to prevent xml errors
	parsedContent = parsedContent.replace(/</g, '');
	// Replace > with it's code (&gt;) to prevent xml errors
	parsedContent = parsedContent.replace(/>/g, '');
	// Remove all links in square brackets
	parsedContent = parsedContent.replace(/\[http([^\]]+)\]/g, '');
	// Remove all text after "Bibliography" surrounded by two or more "="
	parsedContent = parsedContent.replace(/\=*\=\s*Bibliography\s*\=\=*(\S|\s)*/gi, '');
	// Remove all text after "References" surrounded by two or more "="
	parsedContent = parsedContent.replace(/\=*\=\s*References\s*\=\=*(\S|\s)*/gi, '');
	// Remove all text after "External links" surrounded by two or more "="
	parsedContent = parsedContent.replace(/\=*\=\s*External links\s*\=\=*(\S|\s)*/gi, '');
	// Remove all text after "See also" surrounded by two or more "="
	parsedContent = parsedContent.replace(/\=*\=\s*See also\s*\=\=*(\S|\s)*/gi, '');
	// Remove all text after "Further reading" surrounded by two or more "="
	parsedContent = parsedContent.replace(/\=*\=\s*Further reading\s*\=\=*(\S|\s)*/gi, '');
	// Remove all instances of "==" or more with line break
	parsedContent = parsedContent.replace(/==+/g, '<br>');
	
	return parsedContent;
}


/*
 *	Called from findNextRevision
 *	Make content readable and print to screen
 */
function finalContent(contentArray, gottenAddress)
{
	// Update the progress bar to 100%
	document.getElementById("progressBar").style.width = "100%";

	// Get title of article from URL part
	var addressArray = gottenAddress.split("/");
	var wikiTitle = addressArray[4];

	// Get the start and end date of the scrape
	var getStartDate = document.getElementById("startDate").value;
	var getEndDate = document.getElementById("endDate").value;
	// Get the time interval of the scrape
	var timeInterval = document.getElementById("oftenDate").options[document.getElementById("oftenDate").selectedIndex].text;

	// Get the format the user wants
	var getFormat = document.getElementById("textFormat").value;
	var getBodyTextFormat = document.getElementById("bodyFormat").value;

	// 1 is xml, 2 is human readable, 3 is plain text, 4 is Wikipedia style formatting
	if( getFormat == 1) {
		// Add xml markup
		var finalString = addXML(contentArray, wikiTitle, getStartDate, getEndDate, timeInterval, getBodyTextFormat);
		// Print out final text
		document.getElementById('printOutHere').innerHTML = finalString;
	}
	else if( getFormat == 2) {
		// Make human readable
		var finalString = makeHumanReadable(contentArray, wikiTitle, getStartDate, getEndDate, timeInterval, getBodyTextFormat);
		// Print out final text
		document.getElementById('printOutHere').innerHTML = finalString;
	}
	else {
		// Error
		sendError("There was an error when formatting the output. An unknown request was entered.");
	}

	// Allow user to select the recently printed text
	document.getElementById('selectTextButton').disabled = false;

	//Re-enable the form for editing
	enableForm();
	// Hide the progress bar after 800 miliseconds
	setTimeout( function(){ $("#progressBarWrapper").slideUp(460)}, 800);
}


/*
 *	Add xml markup to resulting array and return a string
 *	Called when final array is finished
 */
function addXML( givenArray, title, startDate, endDate, timeInterval, bodyTextFormat)
{
	// Get current date and time
	var currentDate = new Date();
	// Parse the title
	title = decodeURI(title);
	title = title.replace(/_/g, ' ');
	// Start building string
	// &lt; - code for < sign so html does not replace it and xml does not error
	// &gt; - code for > sign so html does not replace it and xml does not error
	var xmlString = "&lt;?xml version='1.0'?&gt;<br>";
	xmlString = xmlString.concat("&lt;collection&gt;<br>");
	xmlString = xmlString.concat("&lt;header&gt;<br>");
	xmlString = xmlString.concat("&lt;article_title&gt;", title, "&lt;/article_title&gt;<br>");
	xmlString = xmlString.concat("&lt;scrape_time&gt;", currentDate, "&lt;/scrape_time&gt;<br>");
	xmlString = xmlString.concat("&lt;start_scrape_date&gt;", startDate, "&lt;/start_scrape_date&gt;<br>");
	xmlString = xmlString.concat("&lt;end_scrape_date&gt;", endDate, "&lt;/end_scrape_date&gt;<br>");
	xmlString = xmlString.concat("&lt;time_interval&gt;", timeInterval, "&lt;/time_interval&gt;<br>");
	xmlString = xmlString.concat("&lt;/header&gt;<br>");

	for( var i = 0; i < givenArray.length; i++)
	{
		xmlString = xmlString.concat("&lt;version&gt;<br>", "&lt;revision_date&gt;");
		xmlString = xmlString.concat(givenArray[i].substr(0, 10)); // First ten digits are the date
		xmlString = xmlString.concat("&lt;/revision_date&gt;<br>", "&lt;revision_time&gt;");
		xmlString = xmlString.concat(givenArray[i].substr(-10)); // Last ten characters are the time
		xmlString = xmlString.concat("&lt;/revision_time&gt;<br>", "&lt;author&gt;");
		xmlString = xmlString.concat(givenArray[i +1]); // Author
		xmlString = xmlString.concat("&lt;/author&gt;<br>","&lt;body&gt;");
		// If user requested plain text, parse the string, other wise leave it alone. 
		// 3 is plain text, 4 is Wikipedia style formatting
		if( bodyTextFormat == 3) {
			xmlString = xmlString.concat( parseString(givenArray[i +2]) ); // Text body
		}
		else {
			xmlString = xmlString.concat( givenArray[i +2]); // Text body
		}
		xmlString = xmlString.concat("&lt;/body&gt;<br>", "&lt;/version&gt;<br>");
		i = i + 2;
	}
	xmlString = xmlString.concat("&lt;/collection&gt;");
	return xmlString;
}


/*
 *	Add line breaks, and text to resulting array and return a string
 *	Called when final array is finished
 */
function makeHumanReadable( givenArray, title, startDate, endDate, timeInterval, bodyTextFormat)
{
	// Get current date and time
	var currentDate = new Date();
	// Parse the title
	title = decodeURI(title);
	title = title.replace(/_/g, ' ');
	// Start building string
	var readableString = "----------------<br>Wikipedia Article: " + title
			+ "<br>----------------<br>Scrape Date: " + currentDate
			+ "<br>----------------<br>Scraping: from " + startDate
			+ " to " + endDate + ", " + timeInterval + "." + "<br>";

	for( var i = 0; i < givenArray.length; i++)
	{
		readableString = readableString.concat("----------------<br>Revision Date: ");
		readableString = readableString.concat(givenArray[i].substr(0, 10)); // First ten digits are the date
		readableString = readableString.concat("<br>----------------<br>Revision Time: ");
		readableString = readableString.concat(givenArray[i].substr(-10)); // Last ten characters are the time
		readableString = readableString.concat("<br>----------------<br>Revision Author: ");
		readableString = readableString.concat(givenArray[i +1]); // Author
		readableString = readableString.concat("<br>----------------<br>Revision Text: ");
		// If user requested plain text, parse the string, other wise leave it alone. 
		// 3 is plain text, 4 is Wikipedia style formatting
		if( bodyTextFormat == 3) {
			readableString = readableString.concat( parseString(givenArray[i +2]), "<br>"); // Text Body
		}
		else {
			readableString = readableString.concat( givenArray[i +2], "<br>"); // Text Body
		}
		i = i + 2;
	}
	return readableString;
}


/*
 *	Called from wikiScrapeGo
 *	
 *	Parse the wiki address together in json format
 *	Uses a limit of two to speed up initial request
 *
 *	Wikipedia Address Variables
 *	http://en.wikipedia.org/w/api.php?format=json&action=query&prop=revisions&callback=?
 *		&rvlimit=max&rvdir=newer&rvprop=ids|timestamp|user|content
 *		&rvstart=20141026000000&rvend=20141029000000&titles=Ada_Lovelace
 *	callback=? is for making sure a response comes. (JSONP)
 *	rvlimit=max is the maximum number of revisions to return.
 *		Use the string "max" to return all revisions
 *	rvdir=newer is the direction to list in.
 *		newer: List oldest revisions first (rvstart has to be lower than rvend)
 *	rvprop=ids|timestamp|user|content is which properties to get for each revision
 *		ids: Get both of these IDs: revid, parentid
 *		timestamp: The date and time the revision was made
 *		user: The user who made the revision, as well as userhidden and anon flags
 *		content: The revision content. If set, the maximum limit will be 10 times as low
 *	rvstart=yyyymmdd000000 is the date to start looking at. Needs to be earlier than rvend.
 *	rvend=yyyymmdd000000 is the date to stop looking at. Needs to be later than rvend.
 */
function parseInitialAddress( gottenAddress, rawStartDate, rawEndDate)
{
	// Standard URL parts for scraping
	var wikiAddressOne = "http://";
	var wikiAddressThree = ".wikipedia.org/w/api.php?format=json&action=query&prop=revisions" +
							"&callback=?&rvlimit=2&rvdir=newer&rvprop=ids|timestamp|user|content&rvstart=";
	var wikiAddressFive = "&rvend="
	var wikiAddressSeven = "&titles=";

	// Parse language and title from gotten address
	// Assuming a certain form of URL. Example:
	/*	http://en.wikipedia.org/wiki/Ada_Lovelace
	 *	[0] = http:
	 *	[1] = 
	 *	[2] = en.wikipedia.org
	 *	[3] = wiki
	 *	[4] = Ada_Lovelace
	 */
	var addressArray = gottenAddress.split("/");
	var tempLanguage = addressArray[2];
	var languageArray = tempLanguage.split(".");

	// Assign language and title variables
	var wikiAddressTitleEight = addressArray[4];
	var wikiAddressLangTwo = languageArray[0];

	// Remove the '/' from the raw dates
	rawStartDate = rawStartDate.replace(/\//g, '');
	rawEndDate = rawEndDate.replace(/\//g, '');
	// Add six zeros on the end
	rawStartDate += "000000";
	rawEndDate += "000000";

	var wikiAddressDateFour = rawStartDate;
	var wikiAddressDateSix = rawEndDate;

	// Concat the address together
	var fullWikiAddress = wikiAddressOne.concat( wikiAddressLangTwo, wikiAddressThree,
			wikiAddressDateFour, wikiAddressFive, wikiAddressDateSix, wikiAddressSeven,
			wikiAddressTitleEight);

	// return the full address
	return fullWikiAddress;
}


/*
 *	Called from wikiScrapeGo
 *	Parse the wiki address together in json format using the information given
 *	Finds the very first revision of the article requested
 *	Uses a limit of one to speed up request
 */
function findFirstRevision(gottenAddress)
{
	/*
	 *	Build the Url to scrape
	 *	Start day is the start date of Wikipedia
	 *	Combined with the limit of 1 and rvdir=newer, will get the first revision
	 */
	// Standard URL parts for scraping
	var wikiAddressOne = "http://";
	var wikiAddressThree = ".wikipedia.org/w/api.php?format=json&action=query&prop=revisions" +
							"&callback=?&rvlimit=1&rvdir=newer&rvprop=ids|timestamp|user|content&rvstart=20010115000000&rvend="
	var wikiAddressFive = "&titles=";

	// Get todays date
	var d = new Date();
	var wikiAddressDateFour = d.getFullYear() + ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2) + "000000";

	// Parse language and title from gotten address
	// Assuming a certain form of URL. Example:
	/*	http://en.wikipedia.org/wiki/Ada_Lovelace
	 *	[0] = http:
	 *	[1] = 
	 *	[2] = en.wikipedia.org
	 *	[3] = wiki
	 *	[4] = Ada_Lovelace
	 */
	var addressArray = gottenAddress.split("/");
	var tempLanguage = addressArray[2];
	var languageArray = tempLanguage.split(".");

	// Assign language and title variables
	var wikiAddressLangTwo = languageArray[0];
	var wikiAddressTitleSix = addressArray[4];

	// Concat the address together
	var tempWikiAddress = wikiAddressOne.concat( wikiAddressLangTwo, wikiAddressThree,
				wikiAddressDateFour, wikiAddressFive, wikiAddressTitleSix);
	
	// return the full address
	return tempWikiAddress;
}


/*
 *	Called from wikiScrapeGo
 *	Parse the wiki address together in json format using the information given
 *	Finds the very last revision of the article requested
 *	Uses a limit of one to speed up request
 */
function findLastRevision(gottenAddress)
{
	/*
	 *	Build the Url to scrape
	 *	Wikipedia API will return latest revision when no info given
	 */
	// Standard URL parts for scraping
	var wikiAddressOne = "http://";
	var wikiAddressThree = ".wikipedia.org/w/api.php?format=json&action=query&prop=revisions" +
							"&callback=?&rvlimit=1&rvprop=ids|timestamp|user|content&titles=";

	// Parse language and title from gotten address
	// Assuming a certain form of URL. Example:
	/*	http://en.wikipedia.org/wiki/Ada_Lovelace
	 *	[0] = http:
	 *	[1] = 
	 *	[2] = en.wikipedia.org
	 *	[3] = wiki
	 *	[4] = Ada_Lovelace
	 */
	var addressArray = gottenAddress.split("/");
	var tempLanguage = addressArray[2];
	var languageArray = tempLanguage.split(".");

	// Assign language and title variables
	var wikiAddressTitleFour = addressArray[4];
	var wikiAddressLangTwo = languageArray[0];

	// Concat the address together
	var tempWikiAddress = wikiAddressOne.concat( wikiAddressLangTwo, wikiAddressThree, wikiAddressTitleFour);

	// return the full address
	return tempWikiAddress;
}


/*
 *	Called from findNextRevision
 *	Parse the wiki address together in json format using the information given
 *	Requests the id, timestamp, user and full content of the revisions
 *	Uses max limit, which is apparently 50
 */
function parseAddress(gottenAddress, revisionId)
{
	/*
	 *	Build the Url to scrape: 
	 *	Find the next entries, and grab the ones we need	
	 */
	// Standard URL parts for scraping
	var wikiAddressOne = "http://";
	var wikiAddressThree = ".wikipedia.org/w/api.php?format=json&action=query&prop=revisions" +
							"&callback=?&rvlimit=max&rvstartid=";
	var wikiAddressFive = "&rvdir=newer&rvprop=ids|timestamp|user|content&titles=";

	// Parse language and title from gotten address
	// Assuming a certain form of URL. Example:
	/*	http://en.wikipedia.org/wiki/Ada_Lovelace
	 *	[0] = http:
	 *	[1] = 
	 *	[2] = en.wikipedia.org
	 *	[3] = wiki
	 *	[4] = Ada_Lovelace
	 */
	var addressArray = gottenAddress.split("/");
	var tempLanguage = addressArray[2];
	var languageArray = tempLanguage.split(".");

	// Assign language and title variables
	var wikiAddressTitleSix = addressArray[4];
	var wikiAddressLangTwo = languageArray[0];

	// Concat the address together
	var tempWikiAddress = wikiAddressOne.concat( wikiAddressLangTwo, wikiAddressThree,
				revisionId, wikiAddressFive, wikiAddressTitleSix);
	
	// return the full address
	return tempWikiAddress;
}


/*
 *	Called when form elements are changed to check if the given info is valid
 */
function validateInfo()
{
	var errorToggle = false;

	// Grab the full Address
	var tempAddress = document.getElementById("wikiAddress").value;
	/*		Regex expression examines if given string starts (^) with
	 *		http followed by 0 to 1 (?) s'es ([s]), followed by a : and // (\/\/),
	 *		followed by two to three ({2,3}) alphabetic characters that form
	 *		the language part of the address. This is followed by the common
	 *		string wikipedia.org/wiki/, and then i to indicate case insenstitive
	 */
	var addressTest = /^http[s]?:\/\/.+\.wikipedia\.org\/wiki\//i;
	// If user has entered a value and URL parts don't match set values, there is an error
	if( (!(addressTest.test(tempAddress)) ) && (document.getElementById("wikiAddress").value != '') )
	{
		document.getElementById('submitButton').disabled = true;
		document.getElementById("wikiAddressBox").className = "form-group has-error";
		$('#wikiAddress').data('bs.popover').options.content = "A valid URL of a Wikipedia article must be entered.";
		errorToggle = true;
	}
	else {
		// Reset error messages
		document.getElementById("wikiAddressBox").className = "form-group";
		$('#wikiAddress').popover('destroy');
		// Initialize error popovers after destruction with timeout function to stall recreating until destruction is done
		setTimeout(function () {
			$('#wikiAddress').popover( {
				placement: "right",
				trigger: "focus hover",
				container: "body"
			});
		}, 200);
		// Update preview with given valid address
		updatePreview();
	}

	// Get start date
	var tempStartDate = document.getElementById("startDate").value;
	/*	
	 *	Regex expression examines if given string starts (^) with
	 *		4 digits (\d{4}) (equal to [0-9]), followed by a / (\/),
	 *		followed by two two digit (\d{2}) sections seperarated by a / (\/),
	 *		and must end after the second set of two numbers ($)
	 */
	var dateTest = /^\d{4}\/\d{2}\/\d{2}$/;
	// Testing if start date is valid, if user has entered a value
	if( (!(dateTest.test(tempStartDate))) && (document.getElementById("startDate").value != '') )
	{
		document.getElementById('submitButton').disabled = true;
		document.getElementById("startDateBox").className = "form-group has-error";
		$('#startDate').data('bs.popover').options.content = "Start date needs to be in the form yyyy/mm/dd.";
		errorToggle = true;
	}
	else {
		// Reset start date error messages
		document.getElementById("startDateBox").className = "form-group";
		$('#startDate').popover('destroy');
		// Initialize error popovers after destruction with timeout function to stall recreating until destruction is done
		setTimeout(function () {
			$('#startDate').popover( {
				placement: "right",
				trigger: "focus hover",
				container: "body"
			});
		}, 200);
	}

	// Get end date
	var tempEndDate = document.getElementById("endDate").value;

	// Given a string in the format: 2014/11/26, parse and store as a date object
	// Subtract 1 off of month, since month counting starts at zero
	var startDateObj = new Date( tempStartDate.substring(0, 4),
			(tempStartDate.substring(5, 7) - 1), tempStartDate.substring(8, 10) );
	var endDateObj = new Date( tempEndDate.substring(0, 4),
			(tempEndDate.substring(5, 7) - 1), tempEndDate.substring(8, 10) );

	// Testing if end date is valid, if user has entered a value
	if( (!(dateTest.test(tempEndDate))) && (document.getElementById("endDate").value != '') )
	{
		document.getElementById('submitButton').disabled = true;
		document.getElementById("endDateBox").className = "form-group has-error";
		$('#endDate').data('bs.popover').options.content = "End date needs to be in the form yyyy/mm/dd.";
		errorToggle = true;
	}
	// Check if end date is later than start date
	else if( (startDateObj >= endDateObj)
		&& (document.getElementById("endDate").value != '') && (document.getElementById("startDate").value != '') )
	{
		document.getElementById('submitButton').disabled = true;
		document.getElementById("endDateBox").className = "form-group has-error";
		$('#endDate').data('bs.popover').options.content = "End date must be later than the start date.";
		errorToggle = true;
	}
	else {
		// Reset end date error messages
		document.getElementById("endDateBox").className = "form-group";
		$('#endDate').popover('destroy');
		// Initialize error popovers after destruction with timeout function to stall recreating until destruction is done
		setTimeout(function () {
			$('#endDate').popover( {
				placement: "right",
				trigger: "focus hover",
				container: "body"
			});
		}, 200);
	}

	// Final check that nothing is empty
	if( (document.getElementById("startDate").value == '') ||
		(document.getElementById("endDate").value == '') ||
		(document.getElementById("wikiAddress").value == '') )	
	{
		// If anything is empty, do not allow submissions
		document.getElementById('submitButton').disabled = true;
		errorToggle = true;
	}

	// If an error has not occured
	if( errorToggle == false)
	{
		// Allow submissions
		document.getElementById('submitButton').disabled = false;
		return true;
	}
	else {
		return false;
	}
}


/*
 *	Called from validateInfo
 *	Update the iframe preview with current url
 */
function updatePreview()
{
	// If user has NOT entered a value
	if( document.getElementById("wikiAddress").value == '')
	{
		// Get Wikipedia main page
		var addressPlaceHolder = document.getElementById("wikiAddress").placeholder;
		document.getElementById('previewFrame').src = addressPlaceHolder;
	}
	else if( document.getElementById("wikiAddress").value != '')
	{
		// Update preview with user given value
		var userAddress = document.getElementById("wikiAddress").value;
		document.getElementById('previewFrame').src = userAddress;
	}
	else {
		// Error occured. Should never reach this error
		sendError("Could not obtain Wikipedia address.");
	}
}


/*
 *	Called from findNextRevision
 *	Update the progress bar based on how far apart the current date and end date are
 *	using the start date as a reference
 */
function updateProgressBar(currentDate, endDate)
{
	// Grab the start date
	var getStartDate = document.getElementById("startDate").value;
	// Given a string in the format: 2014/11/26, parse and store as a date object
	// Subtract 1 off of month, since month counting starts at zero
	var startDateObj = new Date( getStartDate.substring(0, 4),
			(getStartDate.substring(5, 7) - 1), getStartDate.substring(8, 10) );

	// Get the total miliseconds of all the dates
	var startMiliSec = Date.parse(startDateObj);
	var currentMiliSec = Date.parse(currentDate);
	var endMiliSec = Date.parse(endDate);

	// Calculate the percentage that the current date is of the end date
	currentMiliSec = currentMiliSec - startMiliSec;
	endMiliSec = endMiliSec - startMiliSec;
	var calcPercent = (currentMiliSec / endMiliSec) * 100;

	document.getElementById("progressBar").style.width = calcPercent + "%";
}


/*
 *	Reset the form, output section, iframe and submit button
 *	When Reset button is clicked
 */
function resetForm()
{
	//Re-enable any disabled form elements and disable submit button
	enableForm();

	// Reset the form
	document.getElementById("wikiForm").reset();

	// Empty the output section
	document.getElementById('printOutHere').innerHTML = '';
	// Disable the select output text button
	document.getElementById('selectTextButton').disabled = true;

	// Reset preview to Wikipedia main page
	var resetAddress = document.getElementById("wikiAddress").placeholder;
	document.getElementById('previewFrame').src = resetAddress;

	// Remove any error messages
	$('#errorOutputAlert').slideUp(460);

	// Use validateInfo to remove all error messages
	validateInfo();

	// Hide the progress bar
	$("#progressBarWrapper").slideUp(460);
}


/*
 *	Reenable all form elements for editing
 *	When Reset button is clicked, error occurs or page is refreshed
 */
function enableForm()
{
	document.getElementById('wikiAddress').disabled = false;
	document.getElementById('startDate').disabled = false;
	document.getElementById('endDate').disabled = false;
	document.getElementById('oftenDate').disabled = false;
	document.getElementById('textFormat').disabled = false;
	document.getElementById('bodyFormat').disabled = false;

	// Disable submit button
	document.getElementById('submitButton').disabled = true;
}


/*
 *	Disable form elements
 *	Called after submit button is pressed
 */
function disableForm()
{
	document.getElementById('wikiAddress').disabled = true;
	document.getElementById('startDate').disabled = true;
	document.getElementById('endDate').disabled = true;
	document.getElementById('oftenDate').disabled = true;
	document.getElementById('textFormat').disabled = true;
	document.getElementById('bodyFormat').disabled = true;
	document.getElementById('selectTextButton').disabled = true;

	// Disable submit button
	document.getElementById('submitButton').disabled = true;
}

/*
 *	Function that shows the given error message when called
 */
 function sendError(errorString)
 {
 	document.getElementById('errorOutputAlert').innerHTML = 
		"<button type='button' class='close alert-close' aria-label='Close'>×</button> <b>Error!</b> " + errorString;
	$('#errorOutputAlert').slideDown(460);
	
	//Re-enable the form for editing
	enableForm();
 }


/*
 *	Select all text inside the div which's id is given
 *	Copied from http://stackoverflow.com/a/1173319
 */
function selectAllText(containerid)
{
	if (document.selection)
	{
		var range = document.body.createTextRange();
		range.moveToElementText(document.getElementById(containerid));
		range.select();
	}
	else if (window.getSelection)
	{
		var range = document.createRange();
		range.selectNode(document.getElementById(containerid));
		window.getSelection().addRange(range);
	}
}


/*
 *	Gives the number of miliseconds that occur in the given number of days
 */
function getMiliseconds(numberOfDays)
{
	return ((1000*60*60*24) * numberOfDays);
}