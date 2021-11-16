FROM python:3.9.7-slim

COPY unfurl.py /unfurl.py

COPY requirements.txt /requirements.txt
RUN pip install -r requirements.txt
COPY entrypoint.sh /entrypoint.sh


ENTRYPOINT ["/entrypoint.sh"]
