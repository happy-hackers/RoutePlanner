## Setup Guide

1. Install uv
    ```
    pip install uv
    ```
2. Install uvicorn
    ```
    pip install uvicorn
    ```
3. Set up the environment
    ```
    uv sync
    ```
4. Run app
    ```
    uv run uvicorn main:app --reload
    ```

## Deployment Info

- URL (GCP Cloud Run): https://routeplanner-api-517627867818.australia-southeast1.run.app
