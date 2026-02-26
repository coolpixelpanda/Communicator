# Push Communicator to GitHub
# Prerequisites:
# 1. Create repo at https://github.com/new?name=Communicator (click "Create repository")
# 2. Create a Personal Access Token: GitHub -> Settings -> Developer settings -> Personal access tokens
#    - Generate new token (classic), give it "repo" scope

param(
  [Parameter(Mandatory=$true)]
  [string]$Token
)

$ErrorActionPreference = "Stop"
$repoUrl = "https://coolpixelpanda:${Token}@github.com/coolpixelpanda/Communicator.git"

# Create repo if it doesn't exist (requires token)
$headers = @{
  "Accept" = "application/vnd.github+json"
  "Authorization" = "Bearer $Token"
  "X-GitHub-Api-Version" = "2022-11-28"
}
$body = '{"name":"Communicator","description":"React + ASP.NET Core communicator app","private":false}'

try {
  Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body -ContentType "application/json" | Out-Null
  Write-Host "Repository created."
} catch {
  if ($_.Exception.Response.StatusCode -eq 422) {
    Write-Host "Repository already exists."
  } else {
    throw
  }
}

# Push
git remote remove origin 2>$null
git remote add origin $repoUrl
git branch -M main
git push -u origin main
Write-Host "Push complete! https://github.com/coolpixelpanda/Communicator"
