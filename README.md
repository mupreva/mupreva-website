# 🌐 mupreva.org

This repository contains the source code for the official **[mupreva.org](https://mupreva.org)** website, scheduled for launch in **2026**.
The project is developed entirely with **custom code**, without the use of any external frameworks or CMS, to ensure maximum performance, security, and flexibility.

---

## 🧩 Project structure

```
tpl/             → HTML templates and related resources
tpl/config/      → Configuration files and global settings
tpl/assets/      → Static assets (images, CSS, JavaScript)
web_app/web/     → Main web application entry point (`index.php`)
doc/             → usage documentation
```

> ⚙️ This project is built fully from scratch using standard web technologies (HTML, CSS, JavaScript, and PHP),
> with no external frameworks or CMS dependencies.

---

## 🚀 Deployment and setup

Follow these steps to deploy or test the project:

1. **Clone the repository**
   ```bash
   git clone https://github.com/mupreva/mupreva-website.git
   ```

2. **Upload the files**
   Copy the repository contents to a web server with **PHP** enabled (e.g., Apache, Nginx, or similar).

3. **Configure the environment**
   Update the configuration files located in:
   ```
   tpl/config/
   ```
   Adjust paths, domain names, and any environment-specific settings (such as database connections, if applicable).

4. **Access the entry point**
   The main entry script is located at:
   ```
   web_app/web/index.php
   ```

5. **Test the site**
   Open your configured domain or localhost in a browser to verify that the site loads correctly.

---

## 🧱 Technologies

- **HTML5**
- **CSS3**
- **JavaScript**
- **PHP** (custom server-side logic)

---

## 🧰 Project goals

The mupreva.org website aims to provide a **modern, accessible, and maintainable** digital platform for the
**Museu de Prehistòria de València**, offering:

- Institutional presentation and visitor information
- Details on exhibitions, collections, and activities
- A modular and scalable architecture for future updates and extensions.
