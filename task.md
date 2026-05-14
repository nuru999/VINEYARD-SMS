# Vineyard Primary School SMS - Upgrade Plan

## School Info
- Full name: Vineyard Primary School
- Tagline: Fruitful Development
- Colors: Pink #E91E8C, Teal #1B4D4D
- Class 1-8, under 100 students, 3 Terms, Kenya

## Upgrades TODO

### 1. Branding
- [ ] Update sidebar: "Vineyard Primary School" + school colors accent
- [ ] Dashboard header with school name + current term
- [ ] Sign-in page with school name + colors

### 2. Fee Defaulters (enhance fees page)
- [ ] Per-term defaulters list - who hasn't paid
- [ ] Amount outstanding per student
- [ ] WhatsApp reminder button (wa.me link with pre-filled message)

### 3. Report Cards (enhance exams/certificates)
- [ ] Printable report card per student per term
- [ ] All subjects, marks, grade, remarks
- [ ] Position in class, teacher remarks, principal remarks
- [ ] School header with logo placeholder

### 4. Timetable (NEW page)
- [ ] Per-class weekly grid (Mon-Fri x 8 periods)
- [ ] Assign subject + teacher per slot
- [ ] Print timetable

### 5. Parent Communication (NEW page)
- [ ] Compose message to parents
- [ ] WhatsApp bulk message (wa.me links)
- [ ] Message history log

### 6. Transport (NEW page)
- [ ] Register routes/vehicles
- [ ] Assign students to routes
- [ ] Fee for transport per term

### 7. Library (NEW page)
- [ ] Book catalog (add/edit/delete)
- [ ] Borrow/return tracking
- [ ] Overdue books list

### 8. Inventory (NEW page)
- [ ] Asset list (name, category, qty, condition)
- [ ] Add/edit/delete assets

### 9. Dashboard improvements
- [ ] Show school name + term prominently
- [ ] Fee defaulters count widget
- [ ] Today's absent count
- [ ] Quick actions

## DB Tables to Add
- timetable_slots (class_id, day, period, subject, teacher_id)
- messages (recipient_type, content, sent_at, sent_by)
- transport_routes (name, vehicle, driver)
- transport_assignments (student_id, route_id, term)
- library_books (title, author, isbn, copies, category)
- library_borrows (book_id, student_id, borrow_date, return_date, due_date)
- inventory_items (name, category, quantity, condition, location)
