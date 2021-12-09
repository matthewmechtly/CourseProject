import json
from pathlib import Path

import metapy

# Run this script out of 'Tests' folder to create the inverted indeces for the webpages
# in the "references_pages" folder. Metapy will not identify the correct directories if this is
# run out of the project top-level directory.

# Global paths
SCRIPT_PATH = Path(__file__).parent
CONFIG_DIR = SCRIPT_PATH / 'config_files'

BOLD_LINE = '=' * 40
THIN_LINE = '-' * 40

def evaluate_query(index, query_terms, k1, b):
    """Runs a BM25 query with the provided query terms and paramters and prints the top five
       results to the console, including the rank, score, document ID and content.

    Args:
        index : metapy inverted index
        query_terms : string containing the query terms of the search
        k1 : BM25 k1 parameter
        b : BM25 b parameter
    """
    ranker = metapy.index.OkapiBM25(k1, b)
    query = metapy.index.Document()
    query.content(query_terms)
    print(BOLD_LINE + '\nQuery:{}, k1:{}, b:{}\n'.format(query_terms, k1, b) + BOLD_LINE + '\n')
    top_docs = ranker.score(index, query, num_results=5)
    for num, (d_id, score) in enumerate(top_docs):
        content = index.metadata(d_id).get('content')
        print('Rank:{}, Score:{}, Doc ID: {}'.format(num + 1, round(score, 4), d_id))
        print(THIN_LINE + '\n' + content + '\n\n')

def get_config_file_for_query(files, doc_name):
    """Looks through available configuration files and returns whether or not the document from
       queries.JSON was found, and if so, the Pathlib object referencing the file.

    Args:
        files : list of Pathlib objects specifying configuration file paths
        doc_name : name of document, from queries.json

    Returns:
        bool : whether or not the config file was found
        Pathlib path: the config file, if found
    """
    for cf in files:
        if cf.stem == doc_name:
            return True, cf
    return False, None

def test_queries():
    """Tests all of the webpages for all of the queries.
    
       First, queries.json is loaded and the document names that are found are used to search for
       config files from /Tests/config_files/. If found, an inverted index is built from the each
       dataset specified by the configuration file using Metapy. Then the query terms and BM25 
       parameters found in queries.json are used to search the inverted index and discover the five
       top-ranked documents. These documents, along with their rank, scores and document IDs are
       output to the console for viewing.
    """
    # Read available webpage datasets
    config_files = CONFIG_DIR.glob('*.toml')
    # Load documents and their queries from JSON object and iterate through docs
    with open('queries.json') as json_file:
        data = json.load(json_file)
        for doc, queries in data.items():
            # Check if query doc has available dataset
            data_exists, config_file = get_config_file_for_query(config_files, doc)
            if data_exists:
                idx = metapy.index.make_inverted_index(str(config_file))
                for q in queries:
                    evaluate_query(idx, q['query'], q['k1'], q['b'])


if __name__ == '__main__':
    test_queries()
