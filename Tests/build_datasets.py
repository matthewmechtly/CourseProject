from pathlib import Path
import shutil

from bs4 import BeautifulSoup

# Run this script out of 'Tests' folder to create the inverted indeces for the webpages
# in the "references_pages" folder. Metapy will not identify the correct directories if this is
# run out of the project top-level directory.

# Global paths
SCRIPT_PATH = Path(__file__).parent
REFERENCE_PAGES_PATH = SCRIPT_PATH / 'reference_pages'
LINE_FILE_PATH = SCRIPT_PATH / 'line.toml'
CONFIG_FILE_SOURCE_PATH = SCRIPT_PATH / 'config.toml'
CONFIG_DIR = SCRIPT_PATH / 'config_files'

CONFIG_REPLACE_STR = 'webpagename'


def make_config_file(page_name):
    # Copy /Tests/config.toml to /Tests/config_files/config.toml and insert name of
    # dataset directory into config file
    filename = page_name + '.toml'
    config_file_dest_path = CONFIG_DIR / filename
    with config_file_dest_path.open(mode='w', encoding='utf-8') as new_file:
        with CONFIG_FILE_SOURCE_PATH.open(mode='r', encoding='utf-8') as old_file:
            for line in old_file:
                if CONFIG_REPLACE_STR in line:
                    line = line.replace(CONFIG_REPLACE_STR, page_name)
                new_file.write(line)

def build_dataset_from_webpage(path):
    with path.open(mode='r', encoding='utf-8') as fp:
        soup = BeautifulSoup(fp, 'html.parser')
        paragraphs = soup.find_all('p')
        paragraph_words = [p.getText().strip() for p in paragraphs if len(p) > 1]
        # Create directory to write website data
        # Path will be /Tests/indeces/dataset/[HTML file name]
        dataset_dir_path = SCRIPT_PATH / 'indeces' / path.stem / 'dataset'
        dataset_dir_path.mkdir(parents=True, exist_ok=True)
        data_file_name = 'dataset.dat'
        dataset_file_path = dataset_dir_path / data_file_name
        # copy line file to directory, since it is required by metapy
        shutil.copy(str(LINE_FILE_PATH), str(dataset_dir_path / 'line.toml'))
        # write website data to .dat file
        with dataset_file_path.open(mode='w', encoding='utf-8') as dp:
            dp.write('\n'.join(paragraph_words))
        make_config_file(path.stem)

def build_datasets():
    # Create directory for customized config files at /Tests/config_files/
    CONFIG_DIR.mkdir(parents=False, exist_ok=True) 
    # Find all web page files in /Tests/reference_pages/
    ref_pages = REFERENCE_PAGES_PATH.glob('*.htm')
    for p in ref_pages:
        build_dataset_from_webpage(p)


if __name__ == '__main__':
    build_datasets()