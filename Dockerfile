FROM python:3.9.7-slim

COPY unf_url.py /unf_url.py

COPY requirements.txt /requirements.txt
RUN pip install -r requirements.txt

# ENTRYPOINT python /unf_url.py
ENTRYPOINT ["/entrypoint.sh"]
