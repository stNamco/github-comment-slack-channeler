FROM python:3.9.7-slim

COPY unf_url.py /unf_url.py

COPY requirements.txt /requirements.txt
RUN pip install -r requirements.txt
COPY entrypoint.sh /entrypoint.sh

# ENTRYPOINT python /unf_url.py
ENTRYPOINT ["/entrypoint.sh"]
