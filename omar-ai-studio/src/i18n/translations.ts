export type Language = 'en' | 'ar'

export const translations = {
  en: {
    appName: 'Omar AI Studio',

    // Sidebar
    workspace: 'Workspace',
    memory: 'Memory',
    promptPacks: 'Prompt Packs',
    agents: 'Agents',
    settings: 'Settings',
    projects: 'Projects',
    newProject: '+ New Project',
    projectName: 'Project name...',
    create: 'Create',
    cancel: 'Cancel',

    // TopBar
    noProject: 'No project selected',
    mockMode: 'Mock Mode',
    liveMode: 'Live Mode',
    run: '▶ Run',
    running: 'Running',
    pause: '⏸ Pause',
    resume: '▶ Resume',
    stop: '⏹ Stop',

    // Workflow
    enterCommand: 'Enter your creative request... (Arabic or English)',
    workflow: 'Workflow',
    output: 'Output',
    workflowComplete: 'Workflow Complete',
    workflowCompleteDesc: 'Prompt pack generated — check the Output tab',
    startWorkflow: 'Enter a command above and press Run to start the workflow',
    allAgentsActivate: 'All 7 agents will activate sequentially',

    // Agent statuses
    idle: 'Idle',
    thinking: 'Thinking',
    working: 'Working',
    waiting: 'Waiting',
    done: 'Done',
    error: 'Error',
    disabled: 'Off',

    // Task statuses
    pending: 'Pending',
    completed: 'Done',
    failed: 'Failed',
    skipped: 'Skipped',

    // Agents panel
    agentsPanel: 'Agents',
    active: 'active',
    agentDisabledMsg: 'Agent disabled — toggle to enable',

    // Console
    console: 'Console',
    entries: 'entries',
    clear: 'CLEAR',
    consoleReady: 'Ready. Enter a command and press Run to begin.',

    // Output
    outputEmpty: 'Run a workflow to generate your first prompt pack',
    outputEmptyHint: 'Try: اعمل حلقة جديدة للأرنب Hopper',
    exportMd: 'Export as Markdown',
    exportMdHint: 'Best for sharing and reading',
    exportJson: 'Export as JSON',
    exportJsonHint: 'Best for developers and APIs',
    packInfo: 'Pack Info',
    created: 'Created',
    originalRequest: 'Original Request',

    // Memory
    memoryTitle: 'Memory',
    memoryItems: 'items',
    memoryDesc: 'Character bibles, style guides, and project memory',
    noMemory: 'No memory items yet. Run a workflow and the Memory Agent will store your project data here.',

    // Prompt packs
    packsTitle: 'Prompt Packs',
    packsDesc: 'Generated prompt packs ready for Flux, Kling, Runway, and other tools',
    noPacks: 'No prompt packs yet. Run a workflow to generate your first pack.',
    viewOutput: 'View Output',

    // Settings
    settingsTitle: 'Settings',
    settingsDesc: 'App configuration and preferences',
    executionMode: 'Execution Mode',
    mockModeDesc: 'Simulated agents with realistic delays — no API keys needed',
    liveModeDesc: 'Connect to real AI APIs (OpenAI, Anthropic, Ollama)',
    about: 'About',
    language: 'Language',

    // Agent settings
    agentConfig: 'Agent Configuration',
    agentConfigDesc: 'Customize each agent\'s instructions and behavior. In Live mode, these instructions are sent to the AI model as system prompts.',
    systemInstructions: 'System Instructions',
    capabilities: 'Capabilities',
    save: 'Save',
    saved: '✓ Saved',
    reset: 'Reset',

    // Permission modal
    permissionRequired: 'Permission Required',
    agentWants: 'An agent wants to perform an action',
    action: 'Action',
    risk: 'Risk',
    deny: 'Deny',
    allow: 'Allow',

    // Output tabs
    story: '📖 Story',
    character: '🎭 Character',
    images: '🎨 Images',
    video: '🎬 Video',
    notes: '📋 Notes',
    export: '💾 Export',
    code: '💻 Code',

    // Coding agent
    codingSkills: 'Coding Skills',
    architecture: 'Architecture',
    debugging: 'Debugging',
    refactor: 'Refactor',
    integration: 'Integration',
    codingAgentStatus: 'Coding Agent',
    analyzing: 'Analyzing',
    planning: 'Planning',
    editing: 'Editing',
    testing: 'Testing',
    reviewing: 'Reviewing',
    codingEmpty: 'Enter a coding request to activate the Coding Agent',
    codingEmptyHint: 'Try: "راجع معمارية المشروع واقترح تحسينات"',

    // Coding workspace
    codingWorkspace: 'Coding Workspace',
    selectProject: '📁 Select Project',
    projectSelected: 'Project selected',
    noProjectSelected: 'No project selected',
    fileCount: 'files',
    codingRequest: 'Enter a coding request...',

    // Skills
    skillsTitle: 'Skills',
    skillsDesc: 'Manage Coding Agent skills and behavior rules',
    addSkill: '+ Add Skill',
    skillTriggers: 'Triggers',
    skillRules: 'Rules',
    skillOutputSections: 'Output Sections',
    skillSafetyNotes: 'Safety Notes',
    skillEnabled: 'Enabled',
    skillDisabled: 'Disabled',
    resetToDefault: 'Reset',
    selectProjectFirst: 'Select a project folder first',

    // Sections
    studio: '🎬 Studio',
    codingLab: '💻 Coding Lab',

    // Studio views
    overview: 'Overview',
    allAgents: 'All Agents',
    runFullWorkflow: 'Run Full Workflow',
    runThisAgent: 'Run Agent',

    // Studio agent workspace descriptions
    chiefDesc: 'Orchestrate the full creative workflow',
    storyDesc: 'Write cinematic stories and scene structures',
    characterDesc: 'Build detailed character bibles',
    imageDesc: 'Generate Flux and ComfyUI image prompts',
    videoDesc: 'Generate Kling, Runway, and Veo video prompts',
    researchDesc: 'Research tools, trends, and creative references',
    memoryDesc2: 'View and manage your project memory',

    // Coding Lab views
    reviewProject: 'Review Project',
    newProject: 'New Project',
    projectHistory: 'History',

    // New Project Wizard
    chooseTemplate: 'Choose Template',
    projectDetails: 'Project Details',
    creating: 'Creating...',
    projectCreated: 'Project Created!',
    projectName2: 'Project Name',
    saveLocation: 'Save Location',
    browse: 'Browse',
    features: 'Features',
    createProject: '✨ Create Project',
    openInFinder: '📁 Open in Finder',
    reviewCode: '🔍 Review Code',
    startNew: '→ Start New',
    filesCreated: 'files created',
    generatingFiles: 'Generating files...',
    writingFiles: 'Writing to disk...'
  },

  ar: {
    appName: 'أوما AI استوديو',

    // Sidebar
    workspace: 'مساحة العمل',
    memory: 'الذاكرة',
    promptPacks: 'حزم البروميبتات',
    agents: 'العملاء',
    settings: 'الإعدادات',
    projects: 'المشاريع',
    newProject: '+ مشروع جديد',
    projectName: 'اسم المشروع...',
    create: 'إنشاء',
    cancel: 'إلغاء',

    // TopBar
    noProject: 'لا يوجد مشروع محدد',
    mockMode: 'وضع المحاكاة',
    liveMode: 'الوضع المباشر',
    run: '▶ تشغيل',
    running: 'جارٍ التشغيل',
    pause: '⏸ إيقاف مؤقت',
    resume: '▶ استئناف',
    stop: '⏹ إيقاف',

    // Workflow
    enterCommand: 'أدخل طلبك الإبداعي... (عربي أو إنجليزي)',
    workflow: 'سير العمل',
    output: 'الناتج',
    workflowComplete: 'اكتمل سير العمل',
    workflowCompleteDesc: 'تم إنشاء حزمة البروميبتات — تحقق من تبويب الناتج',
    startWorkflow: 'أدخل أمراً أعلاه واضغط تشغيل لبدء سير العمل',
    allAgentsActivate: 'سيعمل جميع العملاء السبعة بالتسلسل',

    // Agent statuses
    idle: 'خامل',
    thinking: 'يفكر',
    working: 'يعمل',
    waiting: 'ينتظر',
    done: 'منتهي',
    error: 'خطأ',
    disabled: 'معطل',

    // Task statuses
    pending: 'في الانتظار',
    completed: 'منتهي',
    failed: 'فشل',
    skipped: 'تم التخطي',

    // Agents panel
    agentsPanel: 'العملاء',
    active: 'نشط',
    agentDisabledMsg: 'العميل معطل — فعّله للبدء',

    // Console
    console: 'وحدة التحكم',
    entries: 'سجل',
    clear: 'مسح',
    consoleReady: 'جاهز. أدخل أمراً واضغط تشغيل للبدء.',

    // Output
    outputEmpty: 'شغّل سير عمل لإنشاء أول حزمة بروميبتات',
    outputEmptyHint: 'جرب: اعمل حلقة جديدة للأرنب Hopper',
    exportMd: 'تصدير كـ Markdown',
    exportMdHint: 'الأفضل للمشاركة والقراءة',
    exportJson: 'تصدير كـ JSON',
    exportJsonHint: 'الأفضل للمطورين والـ APIs',
    packInfo: 'معلومات الحزمة',
    created: 'تاريخ الإنشاء',
    originalRequest: 'الطلب الأصلي',

    // Memory
    memoryTitle: 'الذاكرة',
    memoryItems: 'عنصر',
    memoryDesc: 'ملفات الشخصيات، أدلة الأسلوب، وذاكرة المشاريع',
    noMemory: 'لا توجد عناصر في الذاكرة بعد. شغّل سير عمل وسيقوم عميل الذاكرة بحفظ بيانات مشروعك هنا.',

    // Prompt packs
    packsTitle: 'حزم البروميبتات',
    packsDesc: 'حزم بروميبتات جاهزة للاستخدام مع Flux وKling وRunway وغيرها',
    noPacks: 'لا توجد حزم بعد. شغّل سير عمل لإنشاء أول حزمة.',
    viewOutput: 'عرض الناتج',

    // Settings
    settingsTitle: 'الإعدادات',
    settingsDesc: 'إعدادات التطبيق والتفضيلات',
    executionMode: 'وضع التنفيذ',
    mockModeDesc: 'عملاء محاكاة مع تأخيرات واقعية — لا تحتاج مفاتيح API',
    liveModeDesc: 'اتصل بـ AI APIs حقيقية (OpenAI، Anthropic، Ollama)',
    about: 'حول التطبيق',
    language: 'اللغة',

    // Agent settings
    agentConfig: 'إعدادات العملاء',
    agentConfigDesc: 'خصّص تعليمات كل عميل وسلوكه. في الوضع المباشر، تُرسل هذه التعليمات كـ system prompt للنموذج.',
    systemInstructions: 'تعليمات النظام',
    capabilities: 'القدرات',
    save: 'حفظ',
    saved: '✓ تم الحفظ',
    reset: 'إعادة تعيين',

    // Permission modal
    permissionRequired: 'إذن مطلوب',
    agentWants: 'يريد أحد العملاء تنفيذ إجراء',
    action: 'الإجراء',
    risk: 'المخاطرة',
    deny: 'رفض',
    allow: 'السماح',

    // Output tabs
    story: '📖 القصة',
    character: '🎭 الشخصية',
    images: '🎨 الصور',
    video: '🎬 الفيديو',
    notes: '📋 الملاحظات',
    export: '💾 تصدير',
    code: '💻 الكود',

    // Coding agent
    codingSkills: 'مهارات البرمجة',
    architecture: 'المعمارية',
    debugging: 'تصحيح الأخطاء',
    refactor: 'إعادة الهيكلة',
    integration: 'التكامل',
    codingAgentStatus: 'عميل البرمجة',
    analyzing: 'يحلل',
    planning: 'يخطط',
    editing: 'يعدّل',
    testing: 'يختبر',
    reviewing: 'يراجع',
    codingEmpty: 'أدخل طلباً برمجياً لتفعيل عميل البرمجة',
    codingEmptyHint: 'جرب: "راجع معمارية المشروع واقترح تحسينات"',

    // Coding workspace
    codingWorkspace: 'مساحة البرمجة',
    selectProject: '📁 اختر مشروع',
    projectSelected: 'مشروع محدد',
    noProjectSelected: 'لا يوجد مشروع محدد',
    fileCount: 'ملف',
    codingRequest: 'أدخل طلباً برمجياً...',

    // Skills
    skillsTitle: 'المهارات',
    skillsDesc: 'إدارة مهارات عميل البرمجة وقواعد السلوك',
    addSkill: '+ إضافة مهارة',
    skillTriggers: 'محفزات التفعيل',
    skillRules: 'القواعد',
    skillOutputSections: 'أقسام الناتج',
    skillSafetyNotes: 'ملاحظات الأمان',
    skillEnabled: 'مفعّل',
    skillDisabled: 'معطّل',
    resetToDefault: 'إعادة تعيين',
    selectProjectFirst: 'اختر فولدر مشروع أولاً',

    // Sections
    studio: '🎬 الاستوديو',
    codingLab: '💻 مختبر البرمجة',

    // Studio views
    overview: 'نظرة عامة',
    allAgents: 'كل العملاء',
    runFullWorkflow: 'تشغيل كل العملاء',
    runThisAgent: 'تشغيل العميل',

    // Studio agent workspace descriptions
    chiefDesc: 'تنسيق سير العمل الإبداعي الكامل',
    storyDesc: 'كتابة القصص وهياكل المشاهد السينمائية',
    characterDesc: 'بناء ملفات الشخصيات بالتفصيل',
    imageDesc: 'توليد بروميبتات Flux و ComfyUI',
    videoDesc: 'توليد بروميبتات Kling و Runway و Veo',
    researchDesc: 'بحث في الأدوات والاتجاهات والمراجع الإبداعية',
    memoryDesc2: 'عرض وإدارة ذاكرة مشاريعك',

    // Coding Lab views
    reviewProject: 'مراجعة مشروع',
    newProject: 'مشروع جديد',
    projectHistory: 'السجل',

    // New Project Wizard
    chooseTemplate: 'اختر قالب',
    projectDetails: 'تفاصيل المشروع',
    creating: 'جارٍ الإنشاء...',
    projectCreated: 'تم إنشاء المشروع!',
    projectName2: 'اسم المشروع',
    saveLocation: 'مكان الحفظ',
    browse: 'تصفح',
    features: 'المميزات',
    createProject: '✨ إنشاء المشروع',
    openInFinder: '📁 فتح في Finder',
    reviewCode: '🔍 مراجعة الكود',
    startNew: '→ بدء مشروع جديد',
    filesCreated: 'ملف تم إنشاؤه',
    generatingFiles: 'جارٍ توليد الملفات...',
    writingFiles: 'جارٍ الكتابة على القرص...'
  }
}

export type TranslationKey = keyof typeof translations.en
