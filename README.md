# BM25 Page Searcher - Final Report
___


## BM25 Page Searcher - Video Demo

https://youtu.be/ja5Snc0Z9vQ

## Overview of Code’s Function

Often, finding the most relevant part of a lengthy web page is infeasible. For example, pressing “Ctrl+F” and typing in a keyword isn’t particularly helpful when several hundred results are returned. Additionally, if we want to find certain parts of a long web page where a particular term coincides with another term, this cannot be done with the built in “find-in-page” search functionality. Therefore, we created this Google Chrome browser extension that allows users to type in ‘n’ different keywords and returns the most relevant
portion of the HTML or PDF document.

The extension basically consists of a simple graphical user interface that contains a search bar, previous/next buttons, and a slider to control the k1 and b variables values. The user must first enter their phrase in the search bar, and press the search button. If there is a match on an HTML document, Chrome will scroll to the correct spot on the page and highlight the matching paragraph. The previous/next buttons can be used to cycle through multiple matches on the website. The sliders can be used to adjust the k1 and b values to potentially find more precise matches on the website. 

If the tool is used on a PDF instead of a website, an alert will appear stating what page in the PDF the match is found in. The user can then jump to the current page using Chrome built-in PDF viewer’s features. This is especially useful for finding relevant pages in long PDF documents.

## Details of Software Implementation

As with most web extensions, the architecture of BM25 Page Searcher can be divided into roughly two separate parts: the user-facing interface and the backend engine being run by the browser. Additionally, there are many supporting files organized hierarchically. At a high level, the user inputs a query into the user interface and the backend calculates which pseudo-document is most relevant, enabling the user to navigate to that pseudo-document. The general file structure and their corresponding implementations are as follows:

### manifest.json:
Every single Chrome extension requires a manifest. Just like a shipping manifest, “manifest.json” discloses what code, permissions, and other settings are included in the extension. Specifically for BM25 Page Searcher, permissions were not only granted to “popup.js” and “content.js”, but also to JavaScript files from the PDF.js package. The manifest also enabled the shortcut of “Ctrl+Shift+S” (“S” as in Search) to be quickly implemented. Since only the current tab’s information is needed to create an inverted index, “activeTab” is the permission associated with the extension.

### pdf.js and the “pdfjs” folder:
The open-source project PDF.js was crucial for the successful integration of PDF-search into BM25 Page Searcher. With over 300 contributors, 15,000 commits, and hundreds of thousands of lines of code, the ability to read and manipulate PDFs using an already available PDF-parsing JavaScript library was a necessity. Leaning heavily on this work completed before us, the support files needed for this package were downloaded–in accordance with the licensing agreement–and integrated as the support files in the folder “pdfjs”.

### popup.html and popup.js:
This is the front-end with which the user directly interfaces. On the GUI, the user can select their desired k_1 and b value, input a query, and instantiate a search. If the page being searched through is in HTML, the user will also be able to dynamically cycle through the most relevant pseudo-documents.

Changing either the k_1 or b values through the slider or the input field will trigger an event listener to run `settingsSender`. This sends the updated k_1 and b values to an object in content.js that maintains state while the extension runs. Also, part of this execution leads to a value reconciliation between the sliders and the input boxes, since they are separate HTML objects that must be reconciled with each other for an optimal user experience.

Pressing the “search” button similarly causes an event listener to be triggered. This runs the `popupQuerySender` function, which sends the words that the user typed to the backend (i.e. content.js). After the query is sent, content.js determines the most relevant pseudo-documents. If the user is searching through an HTML document, then, the browser will automatically scroll to the most relevant paragraph, highlighting it in the process. If the user is searching through a PDF document, then the user will be alerted to the most relevant page, relative to the inputted query.

When cycling through the most relevant pseudo-documents in an HTML document, the user can press the “Prev” and “Next” buttons. Pressing these buttons trigger event listeners that run `popupPrevSender` and `popupNextSender` respectively. On the backend, the messages are received, the next (or previous) most relevant pseudo-document is determined, and the browser scrolls to the paragraph in question.

### content.js:
Content.js is divided into 3 different sections: the section that controls the program flow, the primary class declaration of `BM25Ranker`, and the set of asynchronous functions required to process PDFs using pdf.js.

For the section that controls the program flow, the first event is to instantiate the BM25Ranker class. Then, one of four different messages are received from popup.js. Based on the message received, either a) the main search method `submit_new_query` is run, b) the method `next` is run, c) the method `prev` is run, or d) the k_1 and b parameters are updated through the method `rank_with_new_parameters`.

If the `submit_new_query` method is run, the previous query results–if any exist–are reset. Then, since the handling of PDFs and HTML documents is so radically different, an if-else statement is used to execute the appropriate methods. If the page in question is an HTML document, then the `parse_tab` method is called. In this method, both the query and the HTML document are parsed, cleaned, and split into their corresponding tokens. Part of this process involves removing stopwords from the queries. Additionally, the lengths of the various pseudo-documents are determined for future calculation purposes.

Continuing with the HTML document’s resolution, `calculate_frequency_matrix` is the next method run. Because most users don’t browse web pages in such a way that would cause them to search in the same documents dozens of times, it is much quicker computationally to only determine the inverted index across the HTML document for the particular query tokens inputted by the user. This removes the need for the expensive, exhaustive inverted index to be created before any browsing or querying actually occurs. And still, in most common cases (like Wikipedia) with a single digit number of search terms, the algorithm runs practically instantly.

After the frequency is determined for each term and query token combination, the `rank_documents` method is called. This method is where the majority of the BM25 algorithm gets calculated. Using the k_1 and b values properties, BM25 is calculated. Said another way, the log-likelihood is determined using a modified BM25 for every single paragraph in the HTML documents, and the paragraph with the highest log likelihood is returned. The “modification” in question is a smoothing technique to ensure that a pseudo-document is alway returned. To accomplish this, a pseudo-count of 0.01 is added to each word probability. Apart from this modification, the implementation is identical to the typical BM25 algorithm.

Once the pseudo-document with the highest log-likelihood is determined, `focus_on_ranked_paragraph` is called. Simply put, this method makes the browser window scroll to the correct area and highlights the paragraph in question.

During the running of `submit_new_query`, an array of the relevant documents is preserved as a property. This allows us to avoid anothing BM25 determination of the document if the user wants to cycle through the `next` most relevant paragraphs. So, if `next` is run after the log-likelihoods have already been determined, then the only thing that occurs is the `current_rank` property is incremented by one and the `focus_on_ranked_paragraph` is called, navigating to the next most relevant paragraph. The exact same situation is true if `prev` is called, except `current_rank` is decreased by one and the browser navigates to the previous paragraph. If either of these methods are called before the pseudo-document log-likelihoods have been determined, then nothing happens. A query must first be run before it is possible to cycle through the results.

The second section of content.js covers the `BM25Ranker` class. The first part of this class’s declaration is simply the establishing of various properties:  k_1, b, and a host of empty placeholders that get determined later. The second part is the methods. These are the methods that we have already mentioned previously while describing the HTML document searching section, with the exception of the `parse_pdf` asynchronous method.

The final section is the series of asynchronous functions needed to use the pdf.js library. These methods are used when–instead of encountering an HTML document–the `submit_new_query` method needs to parse a PDF. If a PDF is indeed encountered, then the method `parse_pdf` is called. `parse_pdf` calls the `getPages` method, which uses the PDF.js library to determine the content of the various pages (by calling `getContent`), as well as the total number of pages within the PDF. These values are saved to class properties in the process. After the waterfall of other method calls, `parse_pdf` continues, cleans the pseudo-documents (the PDF pages in this case) and removes stopwords. Finally, the length of each page is determined, and the list of pseudo-documents are returned to `submit_new_query`. Just like the HTML document ranking, `calculate_frequency_matrix` is called followed by `rank_documents`. However, the PDF parsing does not call `focus_on_ranked_paragraph`, since Chrome and PDF.js has no way to navigate to particular pseudo-documents within the PDF without resetting the entire search.

### “Tests” Folder:

#### Overview

This folder provides scripts to automate testing queries against websites of the user's choice to validate the results of the extension's implementation of the BM25 ranking algorithm.

The user can copy HTML files with content-rich paragraphs into /Tests/reference_files/ and use the provided Python scripts build_datasets.py to generate line corpus files and Metapy configuration files automatically.

Test queries are entered manually into queries.json. Each entry specifies a web page file name, its queries, and the BM25 parameters for each query.

To execute the queries against all available datasets, the user executes the Python script test_bm25_webpages.py. Ranking results are output to the console.

#### Requirements and Installation

Requirements and Installation

The Python modules Beautiful Soup and Metapy are both required for the test module. In order for both modules to work, Python version 3.6 is also required.

Once Python 3.6 is installed, preferably in a virtual environment, navigate to the /Tests/ directory and use requirements.txt to install the required modules:

$ pip install -r requirements.txt

Once the required modules are successfully installed, execute the testing scripts from the /Tests/ directory. Failure to do so will prevent Metapy from identifying the correct directories.

#### Preparation and Execution of Tests

1. Copy all the webpage HTML files of choice (e.g. "my_webpage.html") into /Tests/reference_files/. An example Wikipedia page is provided.
2. Execute build_datasets.py from the /Tests/ folder. This automatically:
    1. Parses the pages and builds a line corpus dataset for each in /Tests/indeces/my_webpage/dataset/
    2. Copies a line file into the dataset directory.
    3. Generates configuration files in /Tests/config_files/. Metapy will use these to reference the paths of the datasets, line file, and eventually, the indices.
3. Write the queries and parameters you'd like to test in queries.json. A few examples are provided corresponding to the Wikipedia page from step 1.
4. Execute test_bm25_webpages.py from the  /Tests/ folder. This automatically:
    1. Parses queries.json.
    2. Looks for configuration files in /Tests/config_files/ corresponding to the documents in the queries.json.
    3. If a match is found, Metapy builds an inverted index from the configuration file path.
    4. Each query corresponding to the document is submitted to a Metapy BM25 ranker object. The results are output to the console. These include the following aspects of the top five ranked documents:
        1. Query term(s)
        2. Query parameters
        3. Rank
        4. BM25 score
        5. Document ID
        6. Document content


## Installation Instructions

#### Requirements:

Chrome, version 95 and above

#### Installation of Browser Extension:

1. Clone repository (https://github.com/matthewmechtly/CourseProject) to a local directory.

`git clone https://github.com/matthewmechtly/CourseProject.git`

2. Open Chrome.
3. Enter "chrome://extensions/" into the browser navigation bar to access the extensions menu.

![image](https://user-images.githubusercontent.com/52465651/145346427-48a1ccf6-90f0-43fb-a5c8-35dfdc2e01cb.png)

4. Enable Developer Mode. In recent Chrome builds, this is a slider located in the top-right corner of the page.

![image](https://user-images.githubusercontent.com/52465651/145346504-79949641-4eda-4c32-89cd-c00906293d51.png)


5. Load the extension:
    1. Press the button labeled "Load unpacked". A file explorer window will pop up asking to specify the location of the extension source code.

    ![image](https://user-images.githubusercontent.com/52465651/145346605-0b364896-a5c2-49da-9f1f-c77020a997ee.png)
    
    2. Select the directory named “Project Code” within the directory where the repo was cloned in step 1. A new extension called “BM25 Page Searcher” will appear on the Extensions page.

![image](https://user-images.githubusercontent.com/52465651/145346923-9434f73c-91bf-4d48-9708-0ab176a68643.png)

6. Pin the extension to the browser toolbar for easy access:
    1. Within the browser toolbar, click the extension menu (looks like a puzzle piece).
    
    ![image](https://user-images.githubusercontent.com/52465651/145347011-74a84e2c-dc9e-426f-b210-aa685af1f7c3.png)
    
    2. Press the pushpin icon next to “BM25 Page Searcher” to pin it to the toolbar.

    ![image](https://user-images.githubusercontent.com/52465651/145347089-8151d2e7-c186-4eb6-bf59-4be5dfe2fb74.png)

## Using the Extension

![image](https://user-images.githubusercontent.com/52465651/145347225-3086b9f3-1911-4743-9905-7ce9ef356c1d.png)

The extension dialog
A: Entry field for query terms, B: Buttons to submit query and navigate through results, C: Sliders for adjustment of BM25 parameters, D: Entry fields for adjustment of BM25 parameters

#### To submit a query:
1. Navigate to a web page of your choice. This extension ranks paragraphs within web pages and pages within PDF files, so it is best suited for longer, text-based content.
2. Open the browser extension. Either:
    1. Press this key combination: [Control] [Shift] [S], or
    2. Click on the BM25 icon pinned to the toolbar, or
    3. If the icon is not pinned, press the extension menu and select “BM25 Page Ranker”.
3. Enter the query term(s):
    1. The search dialog will appear. Enter the search term(s) into the large text entry at the center of the dialog.
    2. Press the “Search” button to submit the query. The browser will highlight and scroll to the top-ranked result.

#### To navigate between ranked results:
* Navigate to the next result by pressing the “Next” button. The browser will highlight and scroll to the next-ranked result.
* Navigate to the previous result by pressing the “Prev” button. The browser will highlight and scroll to the previously-ranked result. If the top-ranked result is currently being shown, no change will be made.


#### To modify BM25 parameters before submitting a query:
1. (Optional) If modifying an existing query, submit a query.
2. Modify BM25 parameters either by moving the sliders or by entering the parameter value directly into the text field for each parameter.


|    | Meaning                       | Range    | Guidance                                                                                            |
|----|-------------------------------|----------|-----------------------------------------------------------------------------------------------------|
| k1 | Term frequency transformation | [0, inf) | Set higher to reduce the influence of query terms being found multiple times in a document.         |
| b  | Document length normalization | [0, 1]   | Set higher to reward query terms being found in shorter documents and to penalize longer documents. |

3. (Optional) Submit a new query. The top-ranked result will be based on the newly-set parameters in the dialog.

## Contribution Summary

| Name and E-mail                           | Contributions                                                                                                                                                                                                                         |
|-------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Matthew Mechtly mechtly2@illinois.edu     | * Created logo and design of UI * Wrote engine that calculated BM25 scores for the documents * Integrated HTML paragraph cycling and highlighting                                                                                     |
| Sean Enright seanre2@illinois.edu         | * Integrated ranker parameters in extension pop-up dialog. * Refactored BM25 algorithm into class for modularity. * Tested module for efficacy.                                                                                       |
| Bhaveshkumar Manivannan bm12@illinois.edu | * Integrated PDF search, allowing BM25 Page Searcher to work with PDF files on the Chrome Browser. Used the PDF.js library in order to implement this feature. * Wrote the overview of the function of the code in the documentation. |
