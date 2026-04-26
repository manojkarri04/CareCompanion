import csv

# A targeted list of eye-specific medications
eye_medicines = [
    "Aflibercept", "Alcaftadine", "Atropine", "Azelastine", "Bacitracin", 
    "Bepotastine", "Bevacizumab", "Bimatoprost", "Brimonidine", "Brinzolamide", 
    "Brolucizumab", "Bromfenac", "Carboxymethylcellulose", "Ciprofloxacin", 
    "Cromolyn", "Cyclopentolate", "Cyclosporine", "Dexamethasone", "Diclofenac", 
    "Dorzolamide", "Erythromycin", "Fluorometholone", "Gatifloxacin", "Gentamicin", 
    "Ketorolac", "Ketotifen", "Latanoprost", "Lifitegrast", "Loteprednol", 
    "Moxifloxacin", "Nepafenac", "Ofloxacin", "Olopatadine", "Phenylephrine", 
    "Pilocarpine", "Polymyxin B", "Prednisolone", "Proparacaine", "Ranibizumab", 
    "Sodium Hyaluronate", "Tafluprost", "Tetracaine", "Timolol", "Tobramycin", 
    "Travoprost", "Tropicamide"
]

# We sort the list alphabetically just to keep the file neat!
eye_medicines.sort()

# This creates the CSV file and writes the names into it
with open('medicine_database.csv', mode='w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    for med in eye_medicines:
        writer.writerow([med])

print("Success! Your eye-specific medicine_database.csv is ready.")