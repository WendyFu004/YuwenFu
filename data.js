/* ==========================================================================
   EDIT THIS FILE — all site content lives here.
   Everything below is placeholder content. Replace it with your own.
   ========================================================================== */

window.SITE = {
  name: "Alex Morgan",
  initials: "AM",
  role: "Gameplay & Tools Engineer",
  location: "Montréal, Canada",
  email: "alex.morgan@example.com",
  phone: "+1 (555) 010-2030",
  website: "alexmorgan.github.io",
  available: true, // shows the "open to opportunities" badge
  tagline:
    "I build the systems that make games feel good — combat, animation pipelines, and the tools that help teams ship them.",
  bio: [
    "I'm a software engineer with eight years of experience across gameplay programming, engine tooling, and production pipelines. I enjoy the space where engineering meets feel: tuning a hit-reaction until it lands, or shaving minutes off a designer's iteration loop.",
    "Outside of work I prototype small games, write about technical design, and contribute to open-source tools. I care about clear code, kind code reviews, and leaving systems better documented than I found them.",
  ],
  facts: [
    ["Based in", "Montréal, Canada"],
    ["Experience", "8+ years"],
    ["Focus", "Gameplay · Tools · Pipelines"],
    ["Languages", "English, French"],
  ],
  stats: [
    { value: 8, suffix: "+", label: "Years shipping" },
    { value: 5, suffix: "", label: "Titles released" },
    { value: 40, suffix: "+", label: "Tools built" },
  ],
  socials: [
    { label: "GitHub", url: "https://github.com/" },
    { label: "LinkedIn", url: "https://www.linkedin.com/" },
    { label: "Email", url: "mailto:alex.morgan@example.com" },
  ],
  resumePdf: "", // optional: path to a PDF, e.g. "assets/resume.pdf". Empty = use browser print.

  experience: [
    {
      role: "Senior Gameplay Programmer",
      org: "Northwind Interactive",
      place: "Montréal",
      start: "2022",
      end: "Present",
      summary: "Lead programmer for the melee combat feature team on a live-service action title.",
      highlights: [
        "Redesigned the hit-reaction system, cutting animation-related bug reports by 45%.",
        "Built a data-driven move-set editor used daily by 12 designers.",
        "Mentored 4 junior programmers; introduced a weekly code-review clinic.",
      ],
      tags: ["C++", "Animation", "Live Ops"],
    },
    {
      role: "Tools Programmer",
      org: "Bluefjord Studios",
      place: "Québec City",
      start: "2019",
      end: "2022",
      summary: "Owned editor tooling and content-validation pipelines for two shipped titles.",
      highlights: [
        "Created an asset validation service that blocked 3,000+ broken submissions pre-commit.",
        "Reduced level-load iteration time from 4 minutes to 40 seconds.",
        "Shipped a Python plugin framework adopted by three other teams.",
      ],
      tags: ["C#", "Python", "Pipelines"],
    },
    {
      role: "Junior Programmer",
      org: "Pixel Harbor",
      place: "Montréal",
      start: "2017",
      end: "2019",
      summary: "Generalist programmer on a mobile and console puzzle-adventure game.",
      highlights: [
        "Implemented the save system and cloud sync across 3 platforms.",
        "Wrote the UI framework later reused for the studio's next title.",
      ],
      tags: ["Unity", "C#", "UI"],
    },
  ],

  education: [
    {
      role: "B.Sc. Computer Science",
      org: "Université de Montréal",
      place: "Montréal",
      start: "2013",
      end: "2017",
      summary: "Specialization in computer graphics and interactive systems.",
      highlights: ["Dean's list, 2015–2017", "Capstone: real-time cloth simulation on GPU"],
      tags: ["Graphics", "Algorithms"],
    },
  ],

  skills: [
    {
      group: "Languages",
      items: [
        ["C++", 95],
        ["C#", 85],
        ["Python", 85],
        ["HLSL", 60],
      ],
    },
    {
      group: "Engines & Tools",
      items: [
        ["Proprietary engines", 90],
        ["Unreal Engine", 75],
        ["Unity", 80],
        ["Perforce / Git", 90],
      ],
    },
    {
      group: "Disciplines",
      items: [
        ["Gameplay systems", 95],
        ["Tools & pipelines", 90],
        ["Animation tech", 80],
        ["Performance profiling", 75],
      ],
    },
  ],

  certifications: ["Certified ScrumMaster (2021)", "GDC Speaker — Tools Summit (2023)"],

  /* Portfolio — `cover` is a 2-colour gradient; set `image` to a path to use a picture instead. */
  projects: [
    {
      title: "Parry Window Visualizer",
      year: "2024",
      category: "Tools",
      cover: ["#e4572e", "#2b2d42"],
      image: "",
      blurb: "In-editor debug overlay that shows timing windows for every combat action, live.",
      details:
        "Designers struggled to reason about frame-tight defensive windows. This overlay renders each action's active, recovery, and parry frames on a scrubbable timeline next to the character, with per-frame hitbox snapshots. It became the default way the team discussed combat balance.",
      role: "Sole developer",
      stack: ["C++", "ImGui", "Engine debug draw"],
      links: [{ label: "Case study", url: "#" }],
    },
    {
      title: "Momentum",
      year: "2023",
      category: "Games",
      cover: ["#3a86ff", "#0b132b"],
      image: "",
      blurb: "A 48-hour game-jam platformer about conserving speed. Top 5% overall.",
      details:
        "Built in a weekend with two friends. I wrote the movement controller, which uses a custom slope-aware solver so speed is never silently lost. Placed in the top 5% of 3,000 entries.",
      role: "Programmer",
      stack: ["Unity", "C#"],
      links: [
        { label: "Play", url: "#" },
        { label: "Source", url: "#" },
      ],
    },
    {
      title: "AssetGuard",
      year: "2021",
      category: "Pipelines",
      cover: ["#06d6a0", "#073b4c"],
      image: "",
      blurb: "Pre-submit validation service that catches broken assets before they land.",
      details:
        "A rule engine with 120+ checks (naming, texture budgets, missing references) running as a Perforce trigger and in the editor. Rules are written in Python and hot-reloaded, so tech artists can add their own without a programmer.",
      role: "Lead developer",
      stack: ["Python", "Perforce triggers", "C# editor plugin"],
      links: [{ label: "Write-up", url: "#" }],
    },
    {
      title: "Animation Retarget Batcher",
      year: "2020",
      category: "Tools",
      cover: ["#ffbe0b", "#5f0f40"],
      image: "",
      blurb: "Batch retargeting tool that processes hundreds of clips across rigs overnight.",
      details:
        "Replaced a manual, click-heavy workflow with a queue-based batch tool and an HTML report of every clip with warnings. Saved the animation team roughly two days per milestone.",
      role: "Developer",
      stack: ["Python", "Qt", "MotionBuilder"],
      links: [],
    },
    {
      title: "Tiny Raytracer",
      year: "2018",
      category: "Open Source",
      cover: ["#8338ec", "#14213d"],
      image: "",
      blurb: "A readable, 1,500-line path tracer written as a teaching resource.",
      details:
        "Physically based path tracer with BVH acceleration, importance sampling, and a step-by-step companion article. Used in two university graphics courses.",
      role: "Author",
      stack: ["C++17", "OpenMP"],
      links: [{ label: "GitHub", url: "#" }],
    },
    {
      title: "Lantern Keeper",
      year: "2017",
      category: "Games",
      cover: ["#fb5607", "#1b1b1e"],
      image: "",
      blurb: "Student puzzle game about light and shadow, shown at a local indie showcase.",
      details:
        "Capstone side-project. Light sources cast real-time 2D shadows that become solid platforms. I built the shadow-geometry system and the level editor.",
      role: "Programmer & designer",
      stack: ["C#", "MonoGame"],
      links: [{ label: "Trailer", url: "#" }],
    },
  ],
};
