$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
gcloud builds submit --config cloudbuild.yaml .
gcloud run services replace service.yaml --region asia-south2
