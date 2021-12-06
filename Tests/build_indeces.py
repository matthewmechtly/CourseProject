from pathlib import Path
import shutil

from bs4 import BeautifulSoup
import metapy

# Run script out of 'Tests' folder

script_path = Path(__file__).parent
ref_path = script_path / 'reference_pages'
line_file_path = script_path / 'line.toml'

def build_index_from_webpage(path):
    with path.open(mode='r', encoding='utf-8') as fp:        
        soup = BeautifulSoup(fp, 'html.parser')
        paragraphs = soup.find_all('p')
        p = [p.getText().strip() for p in paragraphs if len(p) > 1]
        # Create directory to write website data
        dataset_dir_path = script_path / path.stem
        dataset_dir_path.mkdir(parents=False, exist_ok=True)
        data_file_name = str(path.stem) + '.dat'
        dataset_file_path = dataset_dir_path / data_file_name
        # copy line file to directory, since it is required by metapy
        shutil.copy(str(line_file_path), str(dataset_dir_path / 'line.toml'))
        # write website data to .dat file
        with dataset_file_path.open(mode='w', encoding='utf-8') as dp:
            dp.write('\n'.join(p))
        # generate inverted index folder and object
        idx = metapy.index.make_inverted_index('config.toml')
        submit_query(idx, 'industrial meat') # move to separate file

def submit_query(index, query_terms):
    ranker = metapy.index.OkapiBM25(2, 0.75)
    query = metapy.index.Document()
    query.content(query_terms)
    top_docs = ranker.score(index, query, num_results=5)
    print(top_docs)
    for num, (d_id, _) in enumerate(top_docs):
        content = index.metadata(d_id).get('content')
        print("{}. {}...\n".format(num + 1, content))

def build_indeces():
    ref_pages = ref_path.glob('*.htm')
    for p in ref_pages:
        build_index_from_webpage(p)

build_indeces()