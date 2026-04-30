import os
import json
import pandas as pd
import numpy as np
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Setup Supabase client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# The high-risk specialties defined by the hackathon prompt
HIGH_RISK_SPECIALTIES = [
    'cardiology', 'generalSurgery', 'orthopedicSurgery',
    'emergencyMedicine', 'nephrology', 'cardiacSurgery',
    'criticalCareMedicine', 'neonatologyPerinatalMedicine'
]

def parse_array_string(val):
    """Converts CSV string representations of arrays into actual Python lists."""
    if pd.isna(val) or val == 'null' or val == '' or val == '[]':
        return []
    try:
        # Some CSV strings might use single quotes, replacing with double for JSON
        val = str(val).replace("'", '"')
        parsed = json.loads(val)
        if isinstance(parsed, list):
            return [str(i).strip() for i in parsed if i]
    except Exception:
        # Fallback for weird formatting
        return [x.strip() for x in str(val).strip('[]').split(',')] if val else []
    return []

def detect_anomaly(specialties, equipment, procedure):
    """Applies the hackathon logic to flag contradictory data."""
    has_specialty = len(specialties) > 0
    has_equipment = len(equipment) > 0
    has_procedure = len(procedure) > 0

    # Anomaly: Claims a specialty but has zero equipment or procedure evidence
    is_anomaly = has_specialty and not has_equipment and not has_procedure
    severity = 'none'

    if is_anomaly:
        # Check if any of the claimed specialties are in the high-risk list
        has_high_risk = any(
            any(hr.lower() in s.lower() for hr in HIGH_RISK_SPECIALTIES) 
            for s in specialties
        )
        severity = 'high' if has_high_risk else 'medium'

    return bool(is_anomaly), severity

import json

def parse_array_string(val):
    """Safely parse stringified JSON arrays back to Python lists."""
    if pd.isna(val) or val == 'null' or not val:
        return []
    try:
        if isinstance(val, str) and val.startswith('['):
            return json.loads(val)
        return []
    except:
        return []

def club_facility_rows(group):
    """Smartly merges duplicate rows together based on data type."""
    combined = {}
    for col in group.columns:
        if col == 'pk_unique_id':
            combined[col] = group[col].iloc[0]
            continue
            
        vals = group[col].dropna()
        if len(vals) == 0:
            combined[col] = None
            continue
            
        # 1. Handle JSON Arrays: Merge all items and remove duplicates
        if col in ['specialties', 'procedure', 'equipment', 'capability', 'affiliationTypeIds', 'phone_numbers']:
            all_elements = set()
            for val in vals:
                parsed = parse_array_string(val)
                all_elements.update(parsed)
            combined[col] = json.dumps(list(all_elements)) if all_elements else None
            
        # 2. Handle Numbers: Take the highest reported number
        elif col in ['numberDoctors', 'capacity']:
            combined[col] = int(vals.max())
            
        # 3. Handle Strings (Names, Addresses): Combine case-insensitive unique values
        else:
            str_vals = vals.astype(str).str.strip().tolist()
            unique_vals = []
            seen = set()
            for v in str_vals:
                if v.lower() not in seen:
                    seen.add(v.lower())
                    unique_vals.append(v)
            
            # If "Manoj" and "MANOJ" exist, it only keeps "MANOJ".
            # If "Takoradi" and "Abesim" exist, it becomes "Takoradi / Abesim"
            combined[col] = " / ".join(unique_vals)
            
    return pd.Series(combined)

def run_seeder():
    print("Loading CSV...")
    df = pd.read_csv('Virtue_Foundation_Ghana_v0_3.csv')
    df = df.replace({np.nan: None})

    # --- THE NEW CLUBBING LOGIC ---
    print("Clubbing duplicate records intelligently...")
    original_count = len(df)
    
    # Group by the ID and apply our smart merging function
    df = df.groupby('pk_unique_id').apply(club_facility_rows).reset_index(drop=True)
    
    
    # ------------------------------

    payloads = []
    print("Processing rows and detecting anomalies...")
    
    # ... the rest of your loop remains exactly the same!

def run_seeder():
    print("Loading CSV...")
    # Ensure the CSV is in the same folder
    df = pd.read_csv('Virtue_Foundation_Ghana_v0_3.csv')
    
    # Clean up NaN values to None for database insertion
    df = df.replace({np.nan: None})

    print("Clubbing duplicate records intelligently...")

    original_count = len(df)
    df = df.groupby('pk_unique_id').apply(club_facility_rows).reset_index(drop=True)
    
    print(f"Compressed {original_count} rows down to {len(df)} heavily enriched unique rows.")
    payloads = []
    
    print("Processing rows and detecting anomalies...")
    for index, row in df.iterrows():
        # Parse arrays
        specialties = parse_array_string(row.get('specialties'))
        equipment = parse_array_string(row.get('equipment'))
        procedure = parse_array_string(row.get('procedure'))
        capability = parse_array_string(row.get('capability'))
        affiliation = parse_array_string(row.get('affiliationTypeIds'))

        # Run anomaly detection
        is_anomaly, anomaly_severity = detect_anomaly(specialties, equipment, procedure)

        # Build the payload mapping strictly to our new SQL table
       # Build the payload mapping strictly to our new SQL table
        # Build the payload mapping strictly to our new SQL table
        facility_data = {
            # Cast the primary key to int just to be safe
            "pk_unique_id": int(row.get('pk_unique_id')) if pd.notnull(row.get('pk_unique_id')) else None,
            
            "name": row.get('name'),
            "specialties": specialties,
            "procedure": procedure,
            "equipment": equipment,
            "capability": capability,
            "organization_type": row.get('organization_type'),
            
            "facilitytypeid": row.get('facilityTypeId'),       
            "operatortypeid": row.get('operatorTypeId'),       
            "affiliationtypeids": affiliation,                 
            
            "address_city": row.get('address_city'),
            "address_stateorregion": row.get('address_stateOrRegion'), 
            "address_country": row.get('address_country'),
            
            # THE FIX: Wrap the outputs in int() to strip away the .0 decimal
            "numberdoctors": int(row.get('numberDoctors')) if pd.notnull(row.get('numberDoctors')) else None,
            "capacity": int(row.get('capacity')) if pd.notnull(row.get('capacity')) else None,
            
            "source_url": row.get('source_url'),
            "description": row.get('description'),
            "missionstatement": row.get('missionStatement'),   
            "is_anomaly": is_anomaly,
            "anomaly_severity": anomaly_severity
        }
        payloads.append(facility_data)

    print(f"Uploading {len(payloads)} facilities to Supabase in batches...")
    
    # Batch insert to avoid overloading the API
    batch_size = 100
    for i in range(0, len(payloads), batch_size):
        batch = payloads[i:i + batch_size]
        response = supabase.table('ghana_facilities').upsert(batch).execute()
        print(f"Inserted batch {i // batch_size + 1}")

    print("Database seeding complete!")

if __name__ == "__main__":
    run_seeder()