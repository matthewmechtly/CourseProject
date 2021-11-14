// code that executes after a webpage loads, allowing you
// to work with the html content itself

console.log('content.js has begun running');

let double_queue = {};
let double_queue_counter = 0;

function runBM25(raw_query){
    console.log("runBM25 has run...")

    const sum_reducer = (accumulator, curr) => accumulator + curr;
    let paragraphs = document.getElementsByTagName('p');
    
    /* ==== Declare BM25 parameters ====== */ 
    
    // Number of pseudo documents in collection (N)
    const num_pseudo_docs = paragraphs.length;
    const b = 0.75
    const k_1 = 1
    const delta = 1.0 // for BM25+, but probably won't use

    let pseudo_docs = [];
    let pseudo_doc_lengths = [];
    let query_terms = [];
    let query_term_weights = [];
    // Number of docs containing the term (df_t)
    let doc_count_with_term = [];
    // Array that hold the log-likelihood of BM25 for the entire document
    // across all the terms.
    let doc_scores = {};
    let sorted_doc_scores = [];

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
        query_terms[term_counter] = term;
        query_term_weights[term_counter] = query_freqs[term];
        term_counter = term_counter+1;
    }

    // clean all the pseudo docs and get length of each pseudo doc in array
    for (let j=0; j<num_pseudo_docs; j++){
        pseudo_docs[j] = paragraphs[j].textContent
                                    .toLowerCase()
                                    .replace(/[^\w\s]/g, " ")
                                    .replace(/\s+/g, " ")
                                    .trim()
                                    .split(' ');

        pseudo_doc_lengths[j] = pseudo_docs[j].length;
    }

    // Average length of document in collection (avgdl)
    avg_doc_length = (pseudo_doc_lengths.reduce(sum_reducer)) / num_pseudo_docs;

    // Number of times a particular term appears in a pseudo-document (tf_td)
    // https://stackoverflow.com/questions/18163234/declare-an-empty-two-dimensional-array-in-javascript
    let term_count_in_docs = new Array(query_terms.length).fill(0).map(() => new Array(num_pseudo_docs).fill(0));
    // Document term matrix indicating whether the term appears in doc 
    let term_count_in_docs_bool = new Array(query_terms.length).fill(0).map(() => new Array(num_pseudo_docs).fill(0));


    // Looping through all the queries, loop through each pseudo-document
    //  and look at each term to get a frequency matrix
    for (let i=0; i<query_terms.length; i++){
        for (let j=0; j<num_pseudo_docs; j++){
            pseudo_docs[j].forEach( function(x){
                if (x === query_terms[i]){
                    term_count_in_docs[i][j] += 1;
                    term_count_in_docs_bool[i][j] = 1; 
                }
            });
        }
        doc_count_with_term[i] =  term_count_in_docs_bool[i].reduce(sum_reducer);
    }

    // Matrix that holds BM25 score for each query term for each pseudo document
    let term_scores = new Array(query_terms.length).fill(0).map(() => new Array(num_pseudo_docs).fill(0));

    // Calculate BM25 for each term and each pseudo-document
    for (let i=0; i<query_terms.length; i++){
        let IDF_numer = num_pseudo_docs - doc_count_with_term[i] + 0.5;
        let IDF_denom = doc_count_with_term[i] + 0.5;
        let IDF_term = Math.log(IDF_numer/IDF_denom + 1);
        for (let j=0; j<num_pseudo_docs; j++){

        // add a pseudo count of 0.01 to numerator to avoid -infinitys
        let second_term_numer = (k_1 + 1) * term_count_in_docs[i][j] + 0.01;
        let second_term_denom = term_count_in_docs[i][j] + (
                    k_1 * (1-b + b*pseudo_doc_lengths[j]/avg_doc_length))
        let second_term = second_term_numer / second_term_denom //+ delta
        // going to take the sum of the logs for more numerical stability
        term_scores[i][j] = Math.log(IDF_term*second_term*query_term_weights[i])
        }
    }

    // Sum all the term scores for each pseudo-document into one score
    // for the entire pseudo-document
    for (j=0; j<num_pseudo_docs; j++){
        doc_scores[j] = 0;
        let temp_doc_score = 0;
        for (i=0; i<query_terms.length; i++){
            // doc_scores[j] += term_scores[i][j]
            temp_doc_score += term_scores[i][j];
        }
        // doc_score_obj[j] = doc_scores[j];
        doc_scores[j] = temp_doc_score;
    }
    
    // put object into an array and sort
    for (let score in doc_scores) {
        sorted_doc_scores.push([score, doc_scores[score]]);
    }
    sorted_doc_scores.sort(function(a, b) {
        return b[1] - a[1];
    });

    best_result_index = sorted_doc_scores[0][0]

    // stores sorted docs stores in global variable for future reference
    double_queue = sorted_doc_scores;

    document.getElementsByTagName('p')[best_result_index].setAttribute("style", "background-color: #ffffcc;");
    document.getElementsByTagName('p')[best_result_index].scrollIntoView({behavior: 'smooth'});
}

function runPrev(){
    // Increment the global counter to get the previous element in the
    // doubly-tailed queue
    double_queue_counter = double_queue_counter - 1

    // Set up logic so that backwards looping is possible (i.e. negative indices)
    if (double_queue_counter>-0.5) {
        prev_result_index = double_queue[double_queue_counter][0];
    } else {
        // console.log(double_queue_counter);
        negative_counter = double_queue_counter + double_queue.length;
        prev_result_index = double_queue[negative_counter][0];
    }
    
    // Move to paragraph corresponding to the index
    document.getElementsByTagName('p')[prev_result_index].setAttribute("style", "background-color: #ffffcc;");
    document.getElementsByTagName('p')[prev_result_index].scrollIntoView({behavior: 'smooth'});
}


function runNext(){
    // Increment the global counter to get the next element in the
    // doubly-tailed queue
    double_queue_counter = double_queue_counter + 1

    // Set up logic so that backwards looping is possible (i.e. negative indices)
    if (double_queue_counter > -0.5) {
        next_result_index = double_queue[double_queue_counter][0];
    } else {
        negative_counter = double_queue_counter + double_queue.length;
        next_result_index = double_queue[negative_counter][0];
    }

    // Move to paragraph corresponding to the index    
    document.getElementsByTagName('p')[next_result_index].setAttribute("style", "background-color: #ffffcc;");
    document.getElementsByTagName('p')[next_result_index].scrollIntoView({behavior: 'smooth'});
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        // console.log(request.message);
        console.log("message received ...")
        if (request.message === "string_to,ensure-no search*with_next_button"){
            runNext();
        } else if (request.message === "string_to,ensure-no search*with_prev_button"){
            runPrev();
        } else {
            runBM25(request.message);
        }


    }
);

// console.log('content.js has finished running');