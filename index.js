const core = require('@actions/core');
const github = require('@actions/github');
const { WebClient } = require('@slack/web-api');

async function createBlocks(url, targetLabel) {

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

  function formatDate(dateString) {
    date = new Date(dateString)
    var y = date.getFullYear();
    var m = ('00' + (date.getMonth()+1)).slice(-2);
    var d = ('00' + date.getDate()).slice(-2);
    return (y + '/' + m + '/' + d);
  }

  const params = parseUrl(url)
  const res = await fetchComment(params.owner,  params.repoName, params.type, params.typeId).catch(e => console.error(e));
  const comment = res.data

  return new Promise(function(resolve, reject) {  

    if (!comment.body.includes(targetLabel)) {
      reject("target label is not included")
    }

    const body = comment.body.startsWith(targetLabel) ? comment.body.slice(targetLabel.length) : comment.body;

    const blocks = [{
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `*質問や共有内容が追加されました！by ${comment.user.login}*`
          }
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `${body} \n\n <${url}|${params.owner}/${params.repoName}> | ${formatDate(comment.created_at)}`
          },
          "accessory": {
            "type": "image",
            "image_url": comment.user.avatar_url,
            "alt_text": "avatar image"
          }
        }]
    resolve(blocks)
  });  
}
class SlackService {

  // NOTE: https://slack.dev/node-slack-sdk/web-api

  static async callPostChat(channelId, blocks) {
    const client = new WebClient(core.getInput('slack_bot_token'))
    return await client.chat.postMessage({
      text: "質問や共有内容が追加されました!",
      channel: channelId,
      blocks: blocks
    });
  }
}

(async () => {
  const githubCommentUrl = core.getInput('github_comment_url')
  const slackChannelId = core.getInput('slack_channel_id')
  const targetLabel = core.getInput('target_label')

  createBlocks(githubCommentUrl, targetLabel).then(blocks => {
    SlackService.callPostChat(slackChannelId, blocks).catch(e => console.error(e));
  }, error => {
    console.log(error)
  });
})();
