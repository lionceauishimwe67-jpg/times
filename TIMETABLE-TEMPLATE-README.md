# Timetable Template JSON

This JSON file contains all the necessary data to generate a school timetable automatically. Upload this file to the Smart Timetable System to create timetables instantly.

## File Structure

```json
{
  "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "classes": [
    {
      "id": 1,
      "name": "S1A",
      "level": "Senior 1",
      "students": 42
    }
  ],
  "subjects": [
    {
      "name": "Mathematics",
      "teacher": "Jean Claude",
      "hours_per_week": 5,
      "availability": "Morning"
    }
  ],
  "rules": [
    "A teacher cannot teach two classes at the same time",
    "Subject hours must match weekly requirements",
    "Avoid repeating the same subject many times in one day",
    "Teachers must follow availability constraints",
    "Every class must have a balanced schedule"
  ],
  "time_slots": [
    "08:00-09:00",
    "09:00-10:00",
    "10:30-11:30",
    "11:30-12:30",
    "13:30-14:30",
    "14:30-15:30"
  ],
  "classId": 1
}
```

## Field Descriptions

### days
- Array of day names for the school week
- Default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

### classes
- Array of class objects
- Each class needs: `id`, `name`, `level` (optional), `students` (optional)

### subjects
- Array of subject objects
- Each subject needs: `name`, `teacher`, `hours_per_week`, `availability`
- `availability` options: "Morning", "Afternoon", "Full Day"

### time_slots
- Array of time slot strings in "HH:MM-HH:MM" format
- These define the available periods for scheduling

### classId
- The ID of the class you want to generate a timetable for
- Must match one of the IDs in the `classes` array

## How to Use

1. Copy the `timetable-template.json` file
2. Edit the data to match your school's requirements
3. Upload the JSON file to the Smart Timetable System
4. The system will automatically generate a complete timetable

## Notes

- The AI will respect teacher availability constraints
- Subjects will be distributed evenly across the week
- Conflicts will be minimized automatically
- You can save the generated timetable to the database