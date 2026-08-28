# Setup script for the NHS Sovereign Agentic Architecture demo
# Clones Zone 1, Zone 2, and the UI on the feature/nhs-app-integration branch.
# Run from the directory where you want the repos to live.

$branch = "feature/nhs-app-integration"

Write-Host "Cloning Zone 1..."
git clone --branch $branch https://github.com/CharlieAtki06/SovereignAgenticArchitectureZoneOne.git

Write-Host "Cloning Zone 2..."
git clone --branch $branch https://github.com/CharlieAtki06/SovereignAgenticArchitectureZoneTwo.git

Write-Host "Cloning UI..."
git clone --branch $branch https://github.com/Biatech12/NHS_Edge_App.git

Write-Host ""
Write-Host "Done. See RUN.md for how to start each service."
