const core = require('@actions/core');
const github = require('@actions/github');
const { WebClient } = require('@slack/web-api');

async function createUnfurl(url) {
  const githubToken = core.getInput('github_token')

  function parseUrl(url) {
    const values = url.split("#")
    const issueId = values[0].split("/")[-1]
    let params = {
      "owner": url.split("/")[3],
      "repoName": url.split("/")[4],
      "issueId": issueId
      }
    
    if (values[1].includes("issuecomment")) {
      const qParams = values[1].split("-")
      params["type"] = qParams[0]
      params["typeId"] = qParams[1]
    } else if (values[1].includes("discussion")) {
      const qParams = values[1].split("_")
      params["type"] = qParams[0]
      params["typeId"] = qParams[1].replace('r', '')
    }
    return params
  };

  async function fetchComment(owner, repoName, type, typeId) {
    const octokit = github.getOctokit(githubToken);

    if (type == "issuecomment") {
      return await octokit.request('GET /repos/{owner}/{repo}/issues/comments/{comment_id}', {
        owner: owner,
        repo: repoName,
        comment_id: typeId
      })
    } else if(type == "discussion") {
      return await octokit.request('GET /repos/{owner}/{repo}/pulls/comments/{comment_id}', {
        owner: owner,
        repo: repoName,
        comment_id: typeId
      })
    } else {
      throw new Error('error');
    }
  }

  const params = parseUrl(url)
  const res = await fetchComment(params.owner,  params.repoName, params.type, params.typeId).catch(e => console.error(e));
  const comment = res.data
  const ts = new Date(comment.created_at).getTime()

  const info = {
      "title": params.type,
      "title_link": url,
      "author_name": comment.user.login,
      "author_icon": comment.user.avatar_url,
      "text": comment.body,
      "ts": ts
  }
  return info
}

class SlackService {

  // NOTE: https://slack.dev/node-slack-sdk/web-api

  static get client() {
    return new WebClient(core.getInput('slack_bot_token'))
  }

  static async callPostChat(channelId, url) {
    return await SlackService.client.chat.postMessage({
      text: url,
      channel: channelId,
    });
  }

  static async callUnfurl(channelId, unfurls, ts) {
    const param = {
      channel: channelId,
      ts: ts,
      unfurls: unfurls
    }
    console.log(param);
    return await SlackService.client.chat.unfurl(param)
  }
}

(async () => {
  const githubCommentUrl = core.getInput('github_comment_url')
  const slackChannelId = core.getInput('slack_channel_id')

  const resPostChat = await SlackService.callPostChat(slackChannelId, githubCommentUrl).catch(e => console.error(e));
  console.log(resPostChat);
  const unfurl = await createUnfurl(githubCommentUrl).catch(e => console.error(e));
  const unfurls = {[githubCommentUrl]: unfurl}
  console.log(unfurls);
  await SlackService.callUnfurl(slackChannelId, unfurls, resPostChat.message.ts).catch(e => console.error(e));
})();
