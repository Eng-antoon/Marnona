import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import os
import sys

# Initialize Firebase Admin
cred = credentials.Certificate("firebase-key.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Courses data from the application
courses_data = [
    {"code": "BIOT502", "name": "Botanical Zool. Field Trips"},
    {"code": "BIOT502", "name": "Organic Chemistry III (Macromolecular Chemistry)"},
    {"code": "BIOT503", "name": "Physical Chemistry II (Electrochemistry)"},
    {"code": "BIOT631", "name": "Genetics & Genetic Engineering I"},
    {"code": "BIOT641", "name": "Cell Biology"},
    {"code": "BIOT651", "name": "Introduction to Biosafety"},
    {"code": "BIOT681", "name": "Bioinformatics"},
    {"code": "BIOT691", "name": "Technical Chemistry & Process Engineering"},
    {"code": "BIOT711", "name": "Microbiology II (Microbiology & Immunology)"},
    {"code": "BIOT732", "name": "Genetics & Genetic Engineering II"},
    {"code": "BIOT751", "name": "Radionuclides"},
    {"code": "BIOT861", "name": "Industrial Biotechnology"},
    {"code": "BIOT891", "name": "Fermentation Technology"},
    {"code": "BIOT899", "name": "Bachelor Thesis"},
    {"code": "CHEM 102", "name": "Engineering Chemistry"},
    {"code": "CHEMt 102 / CHEMp 102", "name": "Chemistry"},
    {"code": "ELCT801", "name": "Electronics"},
    {"code": "PHBC521", "name": "Biochemistry & Biochemical Analytical Methods"},
    {"code": "PHBC621", "name": "Clinical Biochemistry"},
    {"code": "PHBL101", "name": "Biology I"},
    {"code": "PHBL202", "name": "Biology II"},
    {"code": "PHBL303", "name": "Pharmacognosy I"},
    {"code": "PHBL511", "name": "Pharmacognosy II"},
    {"code": "PHBL621", "name": "Phytochemistry I"},
    {"code": "PHBL722", "name": "Phytochemistry II"},
    {"code": "PHBL731", "name": "Medicinal Plants/Marine Excusrions"},
    {"code": "PHBL831", "name": "Phytotherapy & Biogenic Drugs"},
    {"code": "PHBT091", "name": "Fermentation Technology"},
    {"code": "PHBT601", "name": "Introduction to Biotechnology"},
    {"code": "PHCM081", "name": "Drug Design"},
    {"code": "PHCM101", "name": "General & Inorganic Analytical Chemistry I"},
    {"code": "PHCM223", "name": "Pharmaceutical Analytical Chemistry II"},
    {"code": "PHCM331", "name": "Organic & Medicinal/Pharmaceutical Chemistry I"},
    {"code": "PHCM341", "name": "Physical Chemistry"},
    {"code": "PHCM432", "name": "Organic & Medicinal/Pharmaceutical Chemistry II"},
    {"code": "PHCM561", "name": "Introduction to Instrumental Analysis"},
    {"code": "PHCM571", "name": "Pharmaceutical Chemistry I"},
    {"code": "PHCM662", "name": "Instrumental Analysis"},
    {"code": "PHCM672", "name": "Pharmaceutical Chemistry II"},
    {"code": "PHCM773", "name": "Pharmaceutical Chemistry III"},
    {"code": "PHCM874", "name": "Pharmaceutical Chemistry IV"},
    {"code": "PHMB401", "name": "General & Pharmaceutical Microbiology"},
    {"code": "PHMB911", "name": "Microbiology II (Immunology, vaccines, sera)"},
    {"code": "PHTC051", "name": "Legislation of Pharmacy Laws"},
    {"code": "PHTC061", "name": "Pharmacy Management"},
    {"code": "PHTC201", "name": "History of Pharmacy & Biotechnology"},
    {"code": "PHTC311", "name": "Pharmaceutics I (Orientation & Physical Pharmacy)"},
    {"code": "PHTC411", "name": "Pharmaceutics II (Drug Dosage Forms)"},
    {"code": "PHTC521", "name": "Biopharmacy & Dosage Form Kinetics"},
    {"code": "PHTC732", "name": "Pharmaceutical Technology I"},
    {"code": "PHTC833", "name": "Pharmaceutical Technology II"},
    {"code": "PHTC934", "name": "Pharmaceutical Technology III"},
    {"code": "PHTC941", "name": "Quality Assurance"},
    {"code": "PHTX051", "name": "Pharmacoepidemiology & Economy"},
    {"code": "PHTX062", "name": "Clinical Pharmacy II"},
    {"code": "PHTX071", "name": "Pharmacotherapeutics"},
    {"code": "PHTX211", "name": "Pharmaceutical & Medical Terminology"},
    {"code": "PHTX301", "name": "Physiology & Anatomy I"},
    {"code": "PHTX402", "name": "Physiology & Anatomy II"},
    {"code": "PHTX621", "name": "Pathology & Histology"},
    {"code": "PHTX731", "name": "Pathophysiology & Pathobiochemistry"},
    {"code": "PHTX831", "name": "Toxicology I"},
    {"code": "PHTX841", "name": "Pharmacology I"},
    {"code": "PHTX942", "name": "Pharmacology II"},
    {"code": "PHTX943", "name": "Toxicology II"},
    {"code": "PHTX944", "name": "First Aid"},
    {"code": "PHTX961", "name": "Clinical Pharmacy I"}
]

def add_course(course_data):
    """Add a course to Firestore"""
    try:
        # Add category derived from the course code
        category = course_data["code"].split("0")[0] if "0" in course_data["code"] else course_data["code"]
        
        # Add description based on name and code
        description = f"This is the {course_data['name']} course with code {course_data['code']}."
        
        # Prepare data
        data = {
            "code": course_data["code"],
            "name": course_data["name"],
            "description": description,
            "category": category,
            "createdAt": firestore.SERVER_TIMESTAMP
        }
        
        # Add to Firestore
        doc_ref = db.collection("courses").add(data)
        print(f"Added course: {course_data['name']} with ID: {doc_ref[1].id}")
        return doc_ref[1].id
    except Exception as e:
        print(f"Error adding course {course_data['name']}: {e}")
        return None

def add_new_course():
    """Interactive function to add a new course"""
    print("\n=== Add New Course ===")
    code = input("Enter course code: ")
    name = input("Enter course name: ")
    description = input("Enter course description (or press Enter for default): ")
    
    if not description:
        description = f"This is the {name} course with code {code}."
    
    category = input("Enter course category (or press Enter for auto-generation): ")
    if not category:
        category = code.split("0")[0] if "0" in code else code
    
    course_data = {
        "code": code,
        "name": name,
        "description": description,
        "category": category,
        "createdAt": firestore.SERVER_TIMESTAMP
    }
    
    try:
        doc_ref = db.collection("courses").add(course_data)
        print(f"Successfully added course: {name} with ID: {doc_ref.id}")
    except Exception as e:
        print(f"Error adding course: {e}")

def list_courses():
    """List all courses in the database"""
    try:
        courses = db.collection("courses").get()
        
        if not courses:
            print("No courses found.")
            return
        
        print("\n=== Courses List ===")
        for course in courses:
            data = course.to_dict()
            print(f"ID: {course.id} - {data.get('code')}: {data.get('name')}")
    except Exception as e:
        print(f"Error listing courses: {e}")

def populate_all_courses():
    """Populate the database with all predefined courses"""
    print("Populating database with courses...")
    
    # Check if courses already exist
    existing_courses = db.collection("courses").get()
    if len(list(existing_courses)) > 0:
        print(f"Warning: {len(list(existing_courses))} courses already exist in the database.")
        confirm = input("Do you want to continue and possibly add duplicates? (y/n): ")
        if confirm.lower() != 'y':
            print("Operation canceled.")
            return
    
    for course in courses_data:
        add_course(course)
    
    print("All courses added successfully!")

def delete_all_courses():
    """Delete all courses from the database"""
    confirm = input("WARNING: This will delete ALL courses. Type 'DELETE' to confirm: ")
    if confirm != "DELETE":
        print("Operation canceled.")
        return
    
    batch_size = 500  # Firestore batch limit
    
    try:
        courses_ref = db.collection("courses")
        docs = courses_ref.limit(batch_size).get()
        deleted = 0
        
        for doc in docs:
            doc.reference.delete()
            deleted += 1
            
        if deleted >= batch_size:
            print(f"Deleted {deleted} documents. There might be more remaining.")
        else:
            print(f"Successfully deleted all {deleted} courses.")
    except Exception as e:
        print(f"Error deleting courses: {e}")

def main_menu():
    """Display the main menu"""
    while True:
        print("\n=== Marnona Firebase Course Manager ===")
        print("1. List all courses")
        print("2. Add a new course")
        print("3. Populate database with all predefined courses")
        print("4. Delete all courses")
        print("5. Exit")
        
        choice = input("\nEnter your choice (1-5): ")
        
        if choice == "1":
            list_courses()
        elif choice == "2":
            add_new_course()
        elif choice == "3":
            populate_all_courses()
        elif choice == "4":
            delete_all_courses()
        elif choice == "5":
            print("Exiting program.")
            sys.exit(0)
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    print("Starting Marnona Firebase Course Manager...")
    main_menu() 