// code that executes after a webpage loads, allowing you
// to work with the html content itself

console.log('content.js has begun running');
var popup_window_id;

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
    submit_new_query(raw_query) {
        this.reset();
        let pseudo_docs = this.parse_tab(raw_query);
        this.calculate_frequency_matrix(pseudo_docs);
        this.rank_documents();
        this.focus_on_ranked_paragraph(0);
    }

    rank_with_new_parameters(){
        this.rank_documents();
        this.focus_on_ranked_paragraph(0);
    }

    next(){
        this.current_rank++;
        this.focus_on_ranked_paragraph(this.current_rank);
    }

    prev(){
        if (this.current_rank != 0){
            this.current_rank--;
            this.focus_on_ranked_paragraph(this.current_rank);
        }
    }

     // Helper methods
    reset() {
        this.doc_scores = {};
        this.sorted_doc_scores = [];
        this.query_terms = [];
        this.query_term_weights = [];
        this.num_pseudo_docs = 0;
        this.doc_count_with_term = [];
        this.pseudo_doc_lengths = [];
        this.term_count_in_docs = [];
        this.current_rank = 0;
        this.restore_last_paragraph();
        this.last_paragraph_index = -1;
        this.last_paragraph_bg = "";
    }

    parse_tab(raw_query) {
        console.log("Parsing new query: " + raw_query);
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
                                        .replace(/[^\w\s]/g, " ")
                                        .replace(/\s+/g, " ")
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