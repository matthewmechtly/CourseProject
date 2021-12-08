// code that executes after a webpage loads, allowing you
// to work with the html content itself

console.log('content.js has begun running');
var popup_window_id;
var num_pages;
var relevant_page = "";

class BM25Ranker {

    constructor(){
        // Array that hold the log-likelihood of BM25 for the entire document
        // across all the terms.
        this.doc_scores = {};
        this.sorted_doc_scores = [];
        // Query terms and term weights
        this.query_terms = [];
        this.query_term_weights = [];
        // Pseudo-document
        this.num_pseudo_docs = 0;
        this.pseudo_doc_lengths = [];
        // Term frequency in document
        this.doc_count_with_term = []; // Number of docs containing the term (df_t)
        // Number of times a particular term appears in a pseudo-document (tf_td)
        this.term_count_in_docs = [];
        // Parameters for BM25 and extensions
        this.current_rank = 0;
        this.last_paragraph_index = -1;
        this.last_paragraph_bg = "";
        this.parameters = {
            "k1": 1.0,
            "b": 0.75,
        };
    }

    // Public methods
    async submit_new_query(raw_query) {
        this.reset();
        var url = location.href;
        if (url.substr(url.length - 3) == "pdf") {
            let pseudo_docs = await this.parse_pdf(raw_query);
            this.calculate_frequency_matrix(pseudo_docs);
            this.rank_documents();

        } else {
            let pseudo_docs = this.parse_tab(raw_query);
            this.calculate_frequency_matrix(pseudo_docs);
            this.rank_documents();
            this.focus_on_ranked_paragraph(0);
        }
    }

    rank_with_new_parameters(){
        this.rank_documents();
        var url = location.href;
        if (url.substr(url.length - 3) == "pdf") {
            // this.focus_on_ranked_pdf_page(0);
        } else {
            this.focus_on_ranked_paragraph(0);
        }
    }

    next(){
        var url = location.href;
        this.current_rank++;
        if (url.substr(url.length - 3) == "pdf") {
            console.log("true");
            // this.focus_on_ranked_pdf_page(this.current_rank);
        } else {
            this.focus_on_ranked_paragraph(this.current_rank);
        }
    }

    prev(){
        var url = location.href;
        if (this.current_rank != 0){
            this.current_rank--;
            if (url.substr(url.length - 3) == "pdf") {
                // this.focus_on_ranked_pdf_page(this.current_rank);
            } else {
                this.focus_on_ranked_paragraph(this.current_rank);
            }
        }
    }

     // Helper methods
    reset() {
        var url = location.href;
        this.doc_scores = {};
        this.sorted_doc_scores = [];
        this.query_terms = [];
        this.query_term_weights = [];
        this.num_pseudo_docs = 0;
        this.doc_count_with_term = [];
        this.pseudo_doc_lengths = [];
        this.term_count_in_docs = [];
        this.current_rank = 0;
        if (url.substr(url.length - 3) != "pdf") {
            this.restore_last_paragraph();
        }
        this.last_paragraph_index = -1;
        this.last_paragraph_bg = "";
    }

    parse_tab(raw_query) {
        console.log("Parsing new tab query: " + raw_query);
        let pseudo_docs = [];

        let paragraphs = document.getElementsByTagName('p');
        this.num_pseudo_docs = paragraphs.length; // Number of pseudo documents in collection (N)
        // clean query from raw input
        let clean_query = raw_query.toLowerCase()
                                    // From: https://stackoverflow.com/questions/4328500/how-can-i-strip-all-punctuation-from-a-string-in-javascript-using-regex
                                    // Removes anything that is not a digit or letter,
                                    .replace(/[^\w\s]/g, " ")
                                    // collapses white space into one space
                                    .replace(/\s+/g, " ")
                                    .trim()
                                    .split(' ');


        // remove stop words from clean query
        clean_query = clean_query.filter(x => !stop_list.includes(x));

        // get term frequency object
        // https://stackoverflow.com/questions/5667888/counting-the-occurrences-frequency-of-array-elements
        const query_freqs = {};
        for (const i of clean_query) {
            query_freqs[i] = query_freqs[i] ? query_freqs[i] + 1 : 1;
        }

        // create arrays for the query term weights, based on frequency of
        // term within the query
        let term_counter = 0;
        for (const term in query_freqs) {
            this.query_terms[term_counter] = term;
            this.query_term_weights[term_counter] = query_freqs[term];
            term_counter = term_counter+1;
        }

        // clean all the pseudo docs and get length of each pseudo doc in array
        for (let j=0; j<this.num_pseudo_docs; j++){
            pseudo_docs[j] = paragraphs[j].textContent
                                        .toLowerCase()
                                        .replace(/[^\w\s]/g, " ")// Removes anything that is not a digit or letter,
                                        .replace(/\s+/g, " ") // collapses white space into one space
                                        .trim()
                                        .split(' ');

            this.pseudo_doc_lengths[j] = pseudo_docs[j].length;
        }
        return pseudo_docs;
    }

    calculate_frequency_matrix(pseudo_docs){
        // https://stackoverflow.com/questions/18163234/declare-an-empty-two-dimensional-array-in-javascript
        this.term_count_in_docs = new Array(this.query_terms.length).fill(0).map(() => new Array(this.num_pseudo_docs).fill(0));
        // Document term matrix indicating whether the term appears in doc
        let term_count_in_docs_bool = new Array(this.query_terms.length).fill(0).map(() => new Array(this.num_pseudo_docs).fill(0));

        let qt = this.query_terms; // To allow use in anonymous function
        let tcid = this.term_count_in_docs; // To allow use in anonymous function
        // Looping through all the queries, loop through each pseudo-document
        //  and look at each term to get a frequency matrix
        for (let i=0; i<this.query_terms.length; i++){
            for (let j=0; j<this.num_pseudo_docs; j++){
                pseudo_docs[j].forEach( function(x){
                    if (x === qt[i]){
                        tcid[i][j] += 1;
                        term_count_in_docs_bool[i][j] = 1;
                    }
                });
            }
            this.doc_count_with_term[i] = term_count_in_docs_bool[i].reduce(BM25Ranker.sum_reducer);
        }
    }

    rank_documents() {
        var url = location.href;
        let k_1 = this.parameters.k1;
        let b = this.parameters.b;
        console.log("Running BM25 with parameters k_1: " + k_1 + ", b: " + b);
        // Matrix that holds BM25 score for each query term for each pseudo document
        let term_scores = new Array(this.query_terms.length).fill(0).map(() => new Array(this.num_pseudo_docs).fill(0));
        // Average length of document in collection (avgdl)
        let avg_doc_length = (this.pseudo_doc_lengths.reduce(BM25Ranker.sum_reducer)) / this.num_pseudo_docs;

        // Calculate BM25 for each term and each pseudo-document
        for (let i=0; i<this.query_terms.length; i++){
            let IDF_numer = this.num_pseudo_docs - this.doc_count_with_term[i] + 0.5;
            let IDF_denom = this.doc_count_with_term[i] + 0.5;
            let IDF_term = Math.log(IDF_numer/IDF_denom + 1);
            for (let j=0; j<this.num_pseudo_docs; j++){

                // add a pseudo count of 0.01 to numerator to avoid -infinitys
                let second_term_numer = (k_1 + 1) * this.term_count_in_docs[i][j] + 0.01;
                let second_term_denom = this.term_count_in_docs[i][j] + (
                            k_1 * (1-b + b*this.pseudo_doc_lengths[j]/avg_doc_length))
                let second_term = second_term_numer / second_term_denom //+ delta
                // going to take the sum of the logs for more numerical stability
                term_scores[i][j] = Math.log(IDF_term*second_term*this.query_term_weights[i])
            }
        }

        // Sum all the term scores for each pseudo-document into one score
        // for the entire pseudo-document
        for (let j=0; j<this.num_pseudo_docs; j++){
            this.doc_scores[j] = 0;
            let temp_doc_score = 0;
            for (let i=0; i<this.query_terms.length; i++){
                // doc_scores[j] += term_scores[i][j]
                temp_doc_score += term_scores[i][j];
            }
            // doc_score_obj[j] = doc_scores[j];
            this.doc_scores[j] = temp_doc_score;
        }

        // put object into an array and sort
        for (let score in this.doc_scores) {
            this.sorted_doc_scores.push([score, this.doc_scores[score]]);
        }
        this.sorted_doc_scores.sort(function(a, b) {
            return b[1] - a[1];
        });
        if (url.substr(url.length - 3) == "pdf") {
            relevant_page = "Relevant Page Number: " + (parseInt(this.sorted_doc_scores[0]) + 1);
            window.alert(relevant_page);
        }
    }

    restore_last_paragraph(){
        // Restore background color of previous selection
        if(this.last_paragraph_index != -1){
            document.getElementsByTagName('p')[this.last_paragraph_index].setAttribute("style", this.last_paragraph_bg);
        }
    }

    focus_on_ranked_paragraph(document_rank){
        this.restore_last_paragraph();
        let paragraph_index = this.sorted_doc_scores[document_rank][0];
        let current_p = document.getElementsByTagName('p')[paragraph_index];
        // Remember last paragraph index and background style
        this.last_paragraph_bg = current_p.getAttribute("style");
        this.last_paragraph_index = paragraph_index;
        // Highlight and go to indicated paragraph
        current_p.setAttribute("style", "background-color: #ffffcc;");
        current_p.scrollIntoView({behavior: 'smooth'});
    }

     // TODO:
     async parse_pdf(raw_query) {
        console.log("Parsing new pdf query: " + raw_query);
        var url = location.href;
        let pseudo_docs = await getPages(url);
        this.num_pseudo_docs = num_pages; // Number of pseudo documents in collection (N)

        // clean query from raw input
        let clean_query = raw_query.toLowerCase()
                                    // From: https://stackoverflow.com/questions/4328500/how-can-i-strip-all-punctuation-from-a-string-in-javascript-using-regex
                                    // Removes anything that is not a digit or letter,
                                    .replace(/[^\w\s]/g, " ")
                                    // collapses white space into one space
                                    .replace(/\s+/g, " ")
                                    .trim()
                                    .split(' ');


        // remove stop words from clean query
        clean_query = clean_query.filter(x => !stop_list.includes(x));

        // get term frequency object
        // https://stackoverflow.com/questions/5667888/counting-the-occurrences-frequency-of-array-elements
        const query_freqs = {};
        for (const i of clean_query) {
            query_freqs[i] = query_freqs[i] ? query_freqs[i] + 1 : 1;
        }

        // create arrays for the query term weights, based on frequency of
        // term within the query
        let term_counter = 0;
        for (const term in query_freqs) {
            this.query_terms[term_counter] = term;
            this.query_term_weights[term_counter] = query_freqs[term];
            term_counter = term_counter+1;
        }

        // get length of each pseudo doc in array
        for (let j=0; j<this.num_pseudo_docs; j++) {
            this.pseudo_doc_lengths[j] = pseudo_docs[j].length;
        }
        console.log("Pseudo_docs length " + pseudo_docs.length);
        return pseudo_docs;
    }

    static sum_reducer(accumulator, curr){ return accumulator + curr; }
}

let ranker = new BM25Ranker();

// Listen for search query and document navigation from pop-up
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action === "search"){ ranker.submit_new_query(request.query); }
        else if (request.action === "next"){ ranker.next(); }
        else if (request.action === "prev"){ ranker.prev(); }
        else if (request.action === "set parameter") {
            // Ensure that parameter sent from pop-up has a valid name
            if (Object.keys(ranker.parameters).indexOf(request.parameter) > -1 ){
                ranker.parameters[request.parameter] = request.value;
                ranker.rank_with_new_parameters();
            };
        };
    }

);

// This function returns the number of pages in the PDF file specified by src.
async function getNumPages(src) {
    const doc = await pdfjsLib.getDocument(src).promise
    // Get the number of pages
    const numPages = doc.numPages
    // console.log("Pages " + numPages);
}

// This function returns the page context.
// Referenced https://writingjavascript.com/how-to-extract-pdf-data-with-pdfjs in creating this function.
async function getContent(src, pageNumber) {
    const doc = await pdfjsLib.getDocument(src).promise

    // Get the PDF file name
   // console.log("URL: " + location.href)
    const page = await doc.getPage(pageNumber);
    return await page.getTextContent();
}

// This function returns a 2D array containing all of the content in the pdf in an array of pages. Each index in the outer array 
// contains a text array corresponding to words in the entire page.
// Referenced https://writingjavascript.com/how-to-extract-pdf-data-with-pdfjs in creating this function.
async function getPages(src) {
    var pages = [];
    var page_text = []; // Array containing list of words.

    const doc = await pdfjsLib.getDocument(src).promise;
    const numPages = doc.numPages;
    num_pages = numPages;
    // console.log("Pages " + numPages);

    for (var pageNumber = 1; pageNumber <= numPages; pageNumber++) {
        /// console.log("Page: " + pageNumber);
        var page_content = "";
        const content = await getContent(src, pageNumber);
        const items = content.items.map((item) =>  {
            page_content += " " + item.str;
            // console.log(item.str);  
        });
        pages.push(page_content);
        // console.log(page_content);
    }

    // Clean up the pages' text.
    for (var x = 0; x < pages.length; x++) {
        pages[x] = pages[x].toLowerCase()   
                    // From: https://stackoverflow.com/questions/4328500/how-can-i-strip-all-punctuation-from-a-string-in-javascript-using-regex
                    .replace(/[^\w\s]/g, " ") // Removes anything that is not a digit or letter,
                    .replace(/\s+/g, " ") // collapses white space into one space
                    .replace(/\n/g, " ")// Replaces new lines with space
                    .replace(/_/g, "")
                    .trim();
        // console.log("Page: " + (x+1));
        // console.log(pages[x]);

        page_text.push(pages[x].split(' '));
    }
    return page_text;
}
