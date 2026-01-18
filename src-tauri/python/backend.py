import sys
import json

def main():
    try:
        # Read a single line from stdin
        input_data = sys.stdin.readline()
        
        if not input_data:
            # Handle empty input if necessary
            return

        data = json.loads(input_data)
        
        # Expecting data structure like: { "rows": [ { "timestamp": "...", "values": [1.0, 2.0] } ], "headers": ["A", "B"] }
        # Or simpler for this PoC. Let's assume the Rust side sends the ProcessedData structure directly.
        
        # Example operation: Calculate average of the first numeric column found
        rows = data.get("rows", [])
        if not rows:
            result = {"message": "No rows provided"}
        else:
            # Flatten values to find a numeric one to average
            # This is a PoC, so we'll just try to average the first value of each row
            total = 0.0
            count = 0
            
            for row in rows:
                values = row.get("values", [])
                for v in values:
                    if v is not None and isinstance(v, (int, float)):
                        total += v
                        count += 1
                        # taking only the first valid number per row for this simple average
                        # or we could calculate average per column. 
                        # Let's keep it simple: Average of ALL valid numbers in the dataset
            
            average = total / count if count > 0 else 0
            result = {
                "average": average,
                "count": count,
                "message": "Analysis complete"
            }

        # Print result as JSON to stdout
        print(json.dumps(result))
        
        # Flush stdout to ensure Rust receives it immediately
        sys.stdout.flush()

    except Exception as e:
        # Send error details back as JSON
        error_response = {"error": str(e)}
        print(json.dumps(error_response))
        sys.stdout.flush()

if __name__ == "__main__":
    main()
