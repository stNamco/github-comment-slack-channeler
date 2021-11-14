import json
from slack_sdk.web import WebClient
from github import Github
from datetime import timedelta, timezone

import sys

args = sys.argv

print("param >>>>")
print(args)

# 環境変数を参照
SLACK_TOKEN = args[1]
SLACK_CHANNEL_ID = args[2]
COMMENT_URL_TEXT = args[3]
SLACK_CHANNELER_GITHUB_TOKEN = args[4]

class GithubService:

    @classmethod
    def create_unfurl(cls, url, *args):
        
        def parse_url(url):
            values = url.split("#")
            issue_id = values[0].split("/")[-1]
            params = {"issue_id": issue_id}
            
            if "issuecomment" in values[1]:
                q_params = values[1].split("-")
                params["type"] = q_params[0]
                params["type_id"] = q_params[1]
            elif "discussion" in values[1]:
                q_params = values[1].split("_")
                params["type"] = q_params[0]
                params["type_id"] = q_params[1].replace('r', '')
            else:
                raise ValueError("requested url is invalid")
            return params

        def fetch_comment(repo, type, issue_id, type_id):
            if type == "issuecomment":
                return repo.get_issue(int(issue_id)).get_comment(int(type_id))
            elif type == "discussion":
                return repo.get_pull(int(issue_id)).get_comment(int(type_id))
            else:
                raise ValueError("requested url is invalid")
                
        token = SLACK_CHANNELER_GITHUB_TOKEN
        g = Github(token)
        repo = g.get_user().get_repo(url.split("/")[4])

        try:
            params = parse_url(url)
            comment = fetch_comment(repo, params["type"], params["issue_id"], params["type_id"])
        except ValueError as e:
            sys.exit()

        jst = timezone(timedelta(hours=+9), 'JST')
        datetime_jst = comment.created_at.astimezone(jst)

        info = {
            "title": params["type"],
            "title_link": url,
            "author_name": comment.user.name,
            "author_icon": comment.user.avatar_url,
            "text": comment.body,
            "ts": datetime_jst.timestamp()   
        }

        return info


class SlackService:

    @classmethod
    def call_post_chat(cls, *args):
        # Slackに投稿
        # https://slack.dev/python-slack-sdk/api-docs/slack_sdk/web/client.html
        slack_client = WebClient(token=SLACK_TOKEN)

        res = slack_client.chat_postMessage(
            channel=SLACK_CHANNEL_ID,
            text=COMMENT_URL_TEXT
        )
        return res

    @classmethod
    def call_post_unfurl(cls, url, ts, *args):
        unfurls = {}
        unfurls[url] = GithubService.create_unfurl(url)

        # Slackでurlを展開
        # https://slack.dev/python-slack-sdk/api-docs/slack_sdk/web/client.html
        slack_client = WebClient(token=SLACK_TOKEN)
        res = slack_client.chat_unfurl(
            channel=SLACK_CHANNEL_ID,
            ts=ts,
            unfurls=unfurls
        )
        return res
                
res_post_chat = SlackService.call_post_chat()
res_post_unfurl = SlackService.call_post_unfurl(COMMENT_URL_TEXT, res_post_chat["ts"])