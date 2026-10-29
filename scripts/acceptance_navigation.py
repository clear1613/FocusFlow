"""Bounded retries for transport failures before a document is received."""
import time


def navigate(page, url, retries):
    for attempt in range(3):
        try:
            return page.goto(url, wait_until='networkidle')
        except Exception as error:
            if attempt == 2 or not any(code in str(error) for code in (
                'net::ERR_CONNECTION_CLOSED', 'net::ERR_CONNECTION_RESET', 'net::ERR_NETWORK_CHANGED'
            )):
                raise
            retries.append({'url': url, 'attempt': attempt + 1, 'error': str(error).splitlines()[0]})
            print('RETRY navigation: ' + str(error).splitlines()[0], flush=True)
            time.sleep(2)
