const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const root = path.resolve(__dirname, '..');
const parsedPath = path.join(root, 'time table', 'parsed-timetables.json');
const teachersPath = path.join(root, 'extracted-teachers.json');
const outputPath = path.join(root, 'AI_Timetable_Sample_L5NIT.pdf');

const parsedTimetables = JSON.parse(fs.readFileSync(parsedPath, 'utf8'));
const teachers = JSON.parse(fs.readFileSync(teachersPath, 'utf8'));
const selected = parsedTimetables.find((item) => item.sheet === 'L5NIT') || parsedTimetables[0];

const teacherNameById = new Map(teachers.map((teacher, index) => [index + 1, teacher.name]));
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const specialSubjects = new Set(['ASSEMBLY', 'BREAK', 'LUNCH']);
const times = [...new Set(selected.schedule.map((item) => item.time))];

function cleanSubject(subject) {
  return String(subject || '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cellFor(time, day) {
  const item = selected.schedule.find((entry) => entry.time === time && entry.day === day);
  if (!item) return '';

  const subject = cleanSubject(item.subject);
  if (!item.teacherId || specialSubjects.has(subject.toUpperCase())) return subject;

  const teacher = teacherNameById.get(item.teacherId) || `Teacher ID ${item.teacherId}`;
  return `${subject} - ${teacher}`;
}

const teachingEntries = selected.schedule.filter((entry) => {
  const subject = cleanSubject(entry.subject).toUpperCase();
  return entry.teacherId && !specialSubjects.has(subject);
});

const subjectSummary = teachingEntries.reduce((summary, entry) => {
  const subject = cleanSubject(entry.subject);
  const teacher = teacherNameById.get(entry.teacherId) || `Teacher ID ${entry.teacherId}`;
  if (!summary.has(subject)) {
    summary.set(subject, { subject, teachers: new Set(), periods: 0 });
  }
  const row = summary.get(subject);
  row.teachers.add(teacher);
  row.periods += 1;
  return summary;
}, new Map());

const aiPayload = {
  school: 'LYCEE SAINT ALEXANDRE SAULI DE MUHURA',
  academicYear: '2024-2025',
  term: 'Term II',
  class: {
    id: 1,
    name: selected.sheet,
    level: selected.level || 'LEVEL V',
    description: selected.classInfo || 'LEVEL V NETWORKING AND INTERNET TECHNOLOGIES',
  },
  days,
  timeSlots: times,
  rules: [
    'A teacher cannot teach two classes at the same time.',
    'Break, lunch, and assembly periods must remain fixed.',
    'Try to keep practical module blocks together when they already appear consecutively.',
    'Avoid placing the same teacher in overlapping periods.',
    'Preserve the Monday to Friday school week structure.',
  ],
  subjects: [...subjectSummary.values()].map((item) => ({
    name: item.subject,
    teachers: [...item.teachers],
    periodsPerWeek: item.periods,
  })),
  timetable: times.map((time) => ({
    time,
    ...Object.fromEntries(days.map((day) => [day, cellFor(time, day)])),
  })),
};

function addHeader(doc, title, subtitle) {
  doc
    .font('Helvetica-Bold')
    .fontSize(17)
    .fillColor('#0f4c81')
    .text(title, { align: 'center' });
  doc
    .moveDown(0.25)
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#475569')
    .text(subtitle, { align: 'center' });
  doc.moveDown(0.8);
}

function drawTable(doc, headers, rows, widths, options = {}) {
  const startX = doc.x;
  let y = doc.y;
  const rowHeight = options.rowHeight || 34;
  const headerHeight = options.headerHeight || 28;

  function drawRow(values, height, fill, bold = false) {
    let x = startX;
    doc.rect(startX, y, widths.reduce((a, b) => a + b, 0), height).fill(fill);
    values.forEach((value, index) => {
      doc
        .rect(x, y, widths[index], height)
        .strokeColor('#cbd5e1')
        .lineWidth(0.5)
        .stroke();
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(options.fontSize || 7.5)
        .fillColor(bold ? '#ffffff' : '#111827')
        .text(String(value || ''), x + 4, y + 5, {
          width: widths[index] - 8,
          height: height - 8,
          ellipsis: true,
        });
      x += widths[index];
    });
    y += height;
  }

  drawRow(headers, headerHeight, '#0f4c81', true);
  rows.forEach((row, index) => {
    drawRow(row, rowHeight, index % 2 === 0 ? '#f8fafc' : '#ffffff');
  });
  doc.y = y + 10;
}

const doc = new PDFDocument({
  size: 'A4',
  layout: 'landscape',
  margin: 28,
  info: {
    Title: 'AI Timetable Sample - L5NIT',
    Author: 'LYCEE SAINT ALEXANDRE SAULI DE MUHURA',
    Subject: 'Sample input PDF for Smart AI Timetable generation',
  },
});

doc.pipe(fs.createWriteStream(outputPath));

addHeader(
  doc,
  'AI TIMETABLE SAMPLE DATA',
  'LYCEE SAINT ALEXANDRE SAULI DE MUHURA | 2024-2025 | Term II | L5NIT'
);

doc
  .font('Helvetica-Bold')
  .fontSize(11)
  .fillColor('#111827')
  .text('Purpose');
doc
  .font('Helvetica')
  .fontSize(9)
  .fillColor('#334155')
  .text(
    'This PDF is a clean sample for uploading into the Smart AI Timetable system. It includes the exact school week, periods, class, teacher names, subject requirements, and scheduling rules extracted from the project data folder.'
  );

doc.moveDown(0.6);
drawTable(
  doc,
  ['Field', 'Value'],
  [
    ['School', aiPayload.school],
    ['Academic year', aiPayload.academicYear],
    ['Term', aiPayload.term],
    ['Class', `${aiPayload.class.name} - ${aiPayload.class.description}`],
    ['Days', days.join(', ')],
    ['Fixed periods', 'Assembly 07:50-08:10, Break 10:10-10:25, Lunch 12:25-13:30, Break 15:30-15:40'],
  ],
  [150, 610],
  { rowHeight: 25, fontSize: 9 }
);

doc
  .font('Helvetica-Bold')
  .fontSize(11)
  .fillColor('#111827')
  .text('Scheduling Rules');
doc
  .font('Helvetica')
  .fontSize(9)
  .fillColor('#334155');
aiPayload.rules.forEach((rule, index) => doc.text(`${index + 1}. ${rule}`));

doc.addPage();
addHeader(doc, 'SUBJECTS AND TEACHERS', 'Use this section to understand weekly teaching load per subject.');
drawTable(
  doc,
  ['Subject', 'Teacher(s)', 'Periods / Week'],
  aiPayload.subjects.map((item) => [item.name, item.teachers.join(', '), item.periodsPerWeek]),
  [180, 460, 120],
  { rowHeight: 25, fontSize: 8.5 }
);

doc.addPage();
addHeader(doc, 'WEEKLY TIMETABLE GRID', 'Each cell is formatted as: Subject - Teacher Name.');
drawTable(
  doc,
  ['Time', ...days],
  aiPayload.timetable.map((row) => [row.time, ...days.map((day) => row[day])]),
  [88, 134, 134, 134, 134, 134],
  { rowHeight: 38, headerHeight: 30, fontSize: 7 }
);

doc.addPage();
addHeader(doc, 'MACHINE READABLE SAMPLE', 'The same data is included below in compact JSON text for AI extraction.');
doc
  .font('Courier')
  .fontSize(6.6)
  .fillColor('#111827')
  .text(JSON.stringify(aiPayload, null, 2), {
    columns: 2,
    columnGap: 18,
    lineGap: 1,
  });

doc.end();

doc.on('end', () => {
  console.log(`Created ${outputPath}`);
});
