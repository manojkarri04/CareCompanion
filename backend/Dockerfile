# 1. Start with a clean, empty computer that only has Python installed
FROM python:3.10-slim

# 2. Make a working folder inside the box called /app
WORKDIR /app

# 3. Copy your tools list from your computer into the box
COPY requirements.txt .

# 4. Tell the box to install all those tools
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy all your other files (like app.py) into the box
COPY . .

# 6. Tell the box exactly how to start the engine when it turns on
CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]