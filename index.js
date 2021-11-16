const core = require('@actions/core');
const github = require('@actions/github');
const { WebClient, ErrorCode } = require('@slack/web-api');

// async function fetch() {
//   const myToken = core.getInput('github_token');
//   const octokit = github.getOctokit(myToken);

//   try {
//     // `who-to-greet` input defined in action metadata file
//     // const  = core.getInput('who-to-greet');
//     // console.log(`Hello ${nameToGreet}!`);
//     const { data: pullRequest } = await octokit.rest.pulls.get({
//         owner: 'stNamco',
//         repo: 'github-comment-slack-channeler',
//         pull_number: 5
//     });
//     console.log(pullRequest);
    
//   } catch (error) {
//     core.setFailed(error.message);
//   }
// }

async function createUnfurl() {
  function parseUrl(url) {
    values = url.split("#")
    issue_id = values[0].split("/")[-1]
    params = {
      "owner": url.split("/")[3],
      "repoName": url.split("/")[4],
      "issue_id": issue_id
      }
    
    if (values[1].includes("issuecomment")) {
      q_params = values[1].split("-")
      params["type"] = q_params[0]
      params["type_id"] = q_params[1]
    } else if (values[1].includes("discussion")) {
      q_params = values[1].split("_")
      params["type"] = q_params[0]
      params["type_id"] = q_params[1].replace('r', '')
    }
    return params
  };

  async function fetch_comment(owner, repoName, type, issue_id, type_id) {
    token = core.getInput('github_token')
    const octokit = github.getOctokit(token);

    if (type == "issuecomment") {
      return await octokit.request('GET /repos/{owner}/{repo}/issues/comments/{comment_id}', {
        owner: owner,
        repo: repoName,
        comment_id: type_id
      })
    } else if(type == "discussion") {
      return await octokit.request('GET /repos/{owner}/{repo}/pulls/comments/{comment_id}', {
        owner: owner,
        repo: repoName,
        comment_id: type_id
      })
    }
  }

  url = core.getInput('github_comment_url')
  params = parseUrl(url)
  comment = await fetch_comment(params["owner"],  params["repoName"], params["type"], params["issue_id"], params["type_id"])

  console.log(comment)

  // jst = timezone(timedelta(hours=+9), 'JST')
  // datetime_jst = comment.created_at.astimezone(jst)

  time = new Date(comment.created_at);
  time.setHours(time.getHours() + 9);
  datetime_jst = time.toLocaleString().slice(0,-3);

  info = {
      "title": params["type"],
      "title_link": url,
      "author_name": comment.user.login,
      "author_icon": comment.user.avatar_url,
      "text": comment.body,
      "ts": datetime_jst 
  }

  return info
}

console.log(createUnfurl())