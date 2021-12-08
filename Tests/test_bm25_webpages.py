import json
from pathlib import Path

import metapy

# Global paths
SCRIPT_PATH = Path(__file__).parent
CONFIG_DIR = SCRIPT_PATH / 'config_files'

BOLD_LINE = '=' * 40
THIN_LINE = '-' * 40

def evaluate_query(index, query_terms, k1, b):
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
    for cf in files:
        if cf.stem == doc_name:
            return True, cf
    return False, None

def test_queries():
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
