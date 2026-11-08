import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BookOpen, CheckCircle2, ClipboardCheck, GraduationCap, LayoutDashboard, LogOut, Menu, MessageSquareText, ShieldCheck, Star, UserRound, X } from "lucide-react";

// Set VITE_API_URL in Vercel to your separately deployed backend URL + /api.
const API = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
const criteria = [
  ["subjectKnowledge", "Knowledge of the subject", "Demonstrates mastery and understanding of the course."],
  ["teachingMethods", "Teaching methods", "Uses effective strategies that support student learning."],
  ["communication", "Communication", "Explains concepts clearly and encourages participation."],
  ["classroomManagement", "Classroom management", "Maintains an organized, respectful learning environment."],
  ["professionalism", "Professionalism", "Shows fairness, punctuality, and respect for students."]
];
const ratingLabels = ["", "Poor", "Fair", "Satisfactory", "Very Good", "Excellent"];
const emptyRatings = () => Object.fromEntries(criteria.map(([key]) => [key, 0]));

function App() {
  const [token, setToken] = useState(localStorage.getItem("fes_token") || "");
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [subjects, setSubjects] = useState([]);
  const [semester, setSemester] = useState("");
  const [evaluations, setEvaluations] = useState([]);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ fullName:"", studentId:"", email:"", password:"", program:"BS Information Technology", yearLevel:"2nd Year", section:"BSIT 2A" });
  const [selected, setSelected] = useState(null);
  const [ratings, setRatings] = useState(emptyRatings());
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const api = useMemo(() => axios.create({ baseURL: API, headers: token ? { Authorization: `Bearer ${token}` } : {} }), [token]);
  const evaluatedIds = new Set(evaluations.map(e => e.subjectId));
  const filteredSubjects = subjects.filter(s => `${s.code} ${s.title} ${s.faculty}`.toLowerCase().includes(search.toLowerCase()));

  function notify(message, type="success") { setNotice({ message, type }); window.setTimeout(() => setNotice(null), 4200); }
  function logout() {
    localStorage.removeItem("fes_token"); setToken(""); setUser(null); setSubjects([]); setEvaluations([]);
    setPage("dashboard"); setNotice(null);
  }
  async function loadData(client=api) {
    const [me, sub, mine] = await Promise.all([client.get("/auth/me"), client.get("/subjects"), client.get("/evaluations/mine")]);
    setUser(me.data.user); setSubjects(sub.data.subjects); setSemester(sub.data.semester); setEvaluations(mine.data.evaluations);
  }
  useEffect(() => {
    if (!token) return;
    loadData().catch(() => { localStorage.removeItem("fes_token"); setToken(""); setUser(null); });
  }, [token]);

  async function submitAuth(e) {
    e.preventDefault(); setBusy(true);
    try {
      const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
      const response = await axios.post(API + endpoint, authForm);
      localStorage.setItem("fes_token", response.data.token); setToken(response.data.token);
      notify(response.data.message);
    } catch (err) { notify(err.response?.data?.message || "Unable to connect to the server. Please try again.", "error"); }
    finally { setBusy(false); }
  }
  function startEvaluation(subject) {
    setSelected(subject); setRatings(emptyRatings()); setComment(""); setPage("evaluate");
  }
  async function submitEvaluation(e) {
    e.preventDefault();
    if (criteria.some(([key]) => !ratings[key])) return notify("Please rate all evaluation criteria before submitting.", "error");
    setBusy(true);
    try {
      const response = await api.post("/evaluations", { subjectId: selected.id, ratings, comment });
      setEvaluations(old => [...old, response.data.evaluation]); setSelected(null); setPage("subjects"); notify(response.data.message);
    } catch (err) { notify(err.response?.data?.message || "Could not submit evaluation.", "error"); }
    finally { setBusy(false); }
  }

  if (!token || !user) {
    return <AuthScreen mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm} onSubmit={submitAuth} busy={busy} notice={notice} />;
  }

  const completed = evaluations.length;
  const pending = Math.max(subjects.length - completed, 0);
  const nav = [
    { id:"dashboard", label:"Overview", icon:LayoutDashboard },
    { id:"subjects", label:"My subjects", icon:BookOpen },
    { id:"history", label:"My evaluations", icon:ClipboardCheck }
  ];
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="brand"><img src="/school-logo.jfif" alt="St. Joseph's College of Baggao logo" /><div><strong>BEU – HEU</strong><span>Faculty Evaluation</span></div><button className="icon-btn close-menu" onClick={() => setMobileOpen(false)}><X size={19}/></button></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav>{nav.map(item => <button key={item.id} className={`nav-item ${page===item.id || (page==="evaluate" && item.id==="subjects") ? "active":""}`} onClick={() => {setPage(item.id);setMobileOpen(false);}}><item.icon size={18}/>{item.label}{item.id==="subjects" && pending>0 && <span className="nav-count">{pending}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="privacy-note"><ShieldCheck size={17}/><span>Your feedback is confidential and used to improve teaching quality.</span></div><button className="nav-item logout" onClick={logout}><LogOut size={18}/>Sign out</button></div>
    </aside>
    {mobileOpen && <button className="scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-btn mobile-menu" onClick={() => setMobileOpen(true)}><Menu/></button><div className="breadcrumb">Student Portal <span>/</span> <b>{page==="dashboard"?"Overview":page==="subjects"?"My subjects":page==="history"?"My evaluations":"Evaluation form"}</b></div><div className="top-user"><div className="avatar">{user.fullName?.[0]?.toUpperCase()}</div><div><strong>{user.fullName}</strong><span>{user.studentId}</span></div></div></header>
      <div className="content">
        {notice && <div className={`toast ${notice.type}`}><CheckCircle2 size={18}/>{notice.message}<button onClick={() => setNotice(null)}><X size={16}/></button></div>}
        {page==="dashboard" && <Dashboard user={user} semester={semester} subjects={subjects} completed={completed} pending={pending} evaluations={evaluations} go={setPage} start={startEvaluation}/>}
        {page==="subjects" && <Subjects subjects={filteredSubjects} allCount={subjects.length} evaluated={evaluatedIds} search={search} setSearch={setSearch} start={startEvaluation} />}
        {page==="history" && <History evaluations={evaluations}/>}
        {page==="evaluate" && selected && <Evaluation subject={selected} ratings={ratings} setRatings={setRatings} comment={comment} setComment={setComment} onSubmit={submitEvaluation} onCancel={() => setPage("subjects")} busy={busy}/>}
      </div>
      <footer className="footer">© 2026 St. Joseph's College of Baggao, Inc. <span>Faith • Communion • Service</span></footer>
    </main>
  </div>;
}

function Brand({compact=false}) { return <div className={`auth-brand ${compact?"compact":""}`}><img src="/school-logo.jfif" alt="St. Joseph's College of Baggao seal"/><div><strong>ST. JOSEPH'S COLLEGE OF BAGGAO, INC.</strong><span>BEU – HEU FACULTY EVALUATION SYSTEM</span></div></div>; }

function AuthScreen({mode,setMode,form,setForm,onSubmit,busy,notice}) {
  const update = e => setForm({...form,[e.target.name]:e.target.value});
  return <div className="auth-page"><div className="auth-left"><Brand/><div className="auth-message"><span className="eyebrow">STUDENT FEEDBACK PORTAL</span><h1>Your voice helps<br/><em>shape better learning.</em></h1><p>Share thoughtful feedback about your classes and faculty. Your responses support a stronger learning experience for everyone.</p><div className="auth-points"><span><ShieldCheck size={17}/> Confidential feedback</span><span><GraduationCap size={17}/> Student-centered improvement</span></div></div><div className="auth-bottom">FAITH <i>•</i> COMMUNION <i>•</i> SERVICE</div></div>
    <div className="auth-right"><div className="auth-card"><div className="mobile-brand"><Brand compact/></div><div className="form-kicker">{mode==="login"?"WELCOME BACK":"GET STARTED"}</div><h2>{mode==="login"?"Sign in to your account":"Create your student account"}</h2><p className="form-sub">{mode==="login"?"Access your enrolled subjects and faculty evaluations.":"Register to view your subjects and submit evaluations."}</p>
      {notice && <div className={`inline-alert ${notice.type}`}>{notice.message}</div>}
      <form onSubmit={onSubmit} className="auth-form">
        {mode==="register" && <><label>Full name<input name="fullName" value={form.fullName} onChange={update} placeholder="e.g. Juan Dela Cruz" required/></label><div className="form-grid"><label>Student ID<input name="studentId" value={form.studentId} onChange={update} placeholder="Student ID" required/></label><label>Section<input name="section" value={form.section} onChange={update} placeholder="e.g. BSIT 2A" required/></label></div></>}
        <label>Email address<input type="email" name="email" value={form.email} onChange={update} placeholder="you@example.com" required/></label>
        <label>Password<input type="password" name="password" value={form.password} onChange={update} placeholder={mode==="register"?"At least 8 characters":"Enter your password"} minLength={mode==="register"?8:undefined} required/></label>
        {mode==="register" && <div className="form-grid"><label>Program<select name="program" value={form.program} onChange={update}><option>BS Information Technology</option><option>BS Education</option><option>BS Business Administration</option><option>Other</option></select></label><label>Year level<select name="yearLevel" value={form.yearLevel} onChange={update}><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option><option>5th Year</option></select></label></div>}
        <button className="primary-btn full" disabled={busy}>{busy?"Please wait...":mode==="login"?"Sign in":"Create account"}</button>
      </form><div className="switch-auth">{mode==="login"?"New to the portal?":"Already have an account?"} <button onClick={() => setMode(mode==="login"?"register":"login")}>{mode==="login"?"Create an account":"Sign in"}</button></div><div className="secure-line"><ShieldCheck size={15}/> Secure student access</div>
    </div></div>
  </div>;
}

function PageHeading({eyebrow,title,subtitle,action}) { return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>; }
function Dashboard({user,semester,subjects,completed,pending,evaluations,go,start}) {
  const recent = [...evaluations].sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt)).slice(0,3);
  return <><PageHeading eyebrow="STUDENT DASHBOARD" title={`Good day, ${user.fullName.split(" ")[0]}!`} subtitle="Here is your faculty evaluation progress for this semester."/><div className="semester-strip"><div className="semester-icon"><GraduationCap/></div><div><span>CURRENT ACADEMIC TERM</span><strong>{semester}</strong></div><span className="term-status">In progress</span></div>
    <div className="stat-grid"><Stat icon={BookOpen} label="Enrolled subjects" value={subjects.length} tone="blue" note="This semester"/><Stat icon={CheckCircle2} label="Evaluations submitted" value={completed} tone="green" note="Successfully recorded"/><Stat icon={ClipboardCheck} label="Pending evaluations" value={pending} tone="amber" note="Awaiting your feedback"/></div>
    <div className="section-title"><div><h3>Evaluation progress</h3><p>Complete an evaluation for each enrolled subject.</p></div><strong>{subjects.length?Math.round(completed/subjects.length*100):0}%</strong></div>
    <div className="progress-track"><div style={{width:`${subjects.length?completed/subjects.length*100:0}%`}}/></div>
    <div className="dashboard-columns"><section className="panel"><div className="panel-head"><div><h3>Subjects to evaluate</h3><p>Your current enrolled subjects</p></div><button className="text-btn" onClick={()=>go("subjects")}>View all <span>→</span></button></div>
      {subjects.filter(s=>!evaluations.some(e=>e.subjectId===s.id)).slice(0,3).map(s=><div className="subject-row" key={s.id}><div className="subject-mark"><BookOpen size={19}/></div><div className="subject-info"><strong>{s.code} · {s.title}</strong><span>{s.faculty}</span></div><button className="outline-btn" onClick={()=>start(s)}>Evaluate</button></div>)}
      {pending===0 && <div className="empty-mini"><CheckCircle2/> All evaluations are complete. Thank you!</div>}
    </section><section className="panel"><div className="panel-head"><div><h3>Recent submissions</h3><p>Your latest feedback activity</p></div></div>
      {recent.length?recent.map(e=><div className="recent-row" key={e.id}><div className="recent-check"><CheckCircle2 size={17}/></div><div><strong>{e.subjectCode}</strong><span>{e.subjectTitle}</span></div><time>{new Date(e.submittedAt).toLocaleDateString()}</time></div>):<div className="empty-mini"><MessageSquareText/> Your submitted evaluations will appear here.</div>}
    </section></div>
  </>;
}
function Stat({icon:Icon,label,value,tone,note}) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={20}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>; }
function Subjects({subjects,allCount,evaluated,search,setSearch,start}) {
  return <><PageHeading eyebrow="ACADEMIC RECORDS" title="My subjects" subtitle="Review your enrolled subjects and complete each faculty evaluation."/><div className="list-toolbar"><div><strong>{allCount} enrolled subjects</strong><span> · Current semester</span></div><div className="search-wrap"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search subjects or faculty..."/></div></div>
    <div className="subject-grid">{subjects.map(s=><article className="subject-card" key={s.id}><div className="subject-card-top"><span className="course-code">{s.code}</span>{evaluated.has(s.id)?<span className="status-done"><CheckCircle2 size={14}/> Submitted</span>:<span className="status-pending">Pending</span>}</div><h3>{s.title}</h3><div className="faculty-line"><div className="faculty-avatar"><UserRound size={17}/></div><div><span>FACULTY</span><strong>{s.faculty}</strong></div></div><div className="subject-meta"><span>{s.section}</span><span>{s.units} units</span></div><button className={evaluated.has(s.id)?"completed-btn":"primary-btn"} disabled={evaluated.has(s.id)} onClick={()=>start(s)}>{evaluated.has(s.id)?"Evaluation submitted":"Start evaluation"}{!evaluated.has(s.id)&&<span>→</span>}</button></article>)}
    {subjects.length===0&&<div className="empty-state"><BookOpen/><h3>No matching subjects</h3><p>Try another search term.</p></div>}</div>
  </>;
}
function Evaluation({subject,ratings,setRatings,comment,setComment,onSubmit,onCancel,busy}) {
  const score = criteria.reduce((sum,[key])=>sum+ratings[key],0);
  return <><PageHeading eyebrow="FACULTY FEEDBACK" title="Evaluation form" subtitle="Please provide an honest and constructive assessment of your learning experience." action={<button className="back-btn" onClick={onCancel}>← Back to subjects</button>}/>
    <div className="evaluation-layout"><form className="panel evaluation-form" onSubmit={onSubmit}><div className="form-subject"><div className="subject-mark large"><BookOpen/></div><div><span>SUBJECT DETAILS</span><h3>{subject.code} · {subject.title}</h3><p>{subject.faculty} · {subject.section}</p></div></div><div className="form-divider"/><div className="criteria-heading"><h3>Teaching performance</h3><p>Rate each statement from 1 (Poor) to 5 (Excellent).</p></div>
      {criteria.map(([key,label,desc],i)=><div className="rating-item" key={key}><div className="rating-copy"><span className="criterion-number">0{i+1}</span><div><strong>{label}</strong><p>{desc}</p></div></div><div className="rating-options">{[1,2,3,4,5].map(n=><button type="button" key={n} aria-label={`${label}: ${ratingLabels[n]}`} title={ratingLabels[n]} className={ratings[key]===n?"rating-choice selected":"rating-choice"} onClick={()=>setRatings(old=>({...old,[key]:n}))}>{n}</button>)}</div>{ratings[key]>0&&<div className="rating-label">{ratingLabels[ratings[key]]}</div>}</div>)}
      <label className="comment-label">Additional comments <span>Optional</span><textarea value={comment} onChange={e=>setComment(e.target.value)} maxLength={1000} placeholder="Share suggestions or comments that may help improve the learning experience..." rows={4}/><small>{comment.length}/1000 characters</small></label>
      <div className="form-actions"><button type="button" className="back-btn" onClick={onCancel}>Cancel</button><button className="primary-btn" disabled={busy}>{busy?"Submitting...":"Submit evaluation"} <span>→</span></button></div>
    </form><aside className="panel guide-panel"><div className="guide-icon"><ShieldCheck/></div><h3>Your feedback matters</h3><p>Evaluations help the college recognize effective teaching practices and identify opportunities for improvement.</p><div className="guide-rule"/><strong>Rating guide</strong>{ratingLabels.slice(1).map((l,i)=><div className="guide-rating" key={l}><span>{i+1}</span>{l}</div>)}<div className="confidential-note"><ShieldCheck size={16}/><span>Responses are treated confidentially. Please be respectful and constructive.</span></div><div className="score-preview"><span>Ratings completed</span><strong>{criteria.filter(([k])=>ratings[k]>0).length} / 5</strong><div className="mini-progress"><div style={{width:`${criteria.filter(([k])=>ratings[k]>0).length*20}%`}}/></div></div></aside></div>
  </>;
}
function History({evaluations}) {
  const sorted=[...evaluations].sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt));
  return <><PageHeading eyebrow="FEEDBACK RECORD" title="My evaluations" subtitle="A record of the faculty evaluations you have successfully submitted."/><div className="panel history-panel"><div className="panel-head"><div><h3>Submission history</h3><p>{evaluations.length} evaluation{evaluations.length===1?"":"s"} submitted</p></div><span className="history-badge"><CheckCircle2 size={15}/> Saved records</span></div>
    {sorted.map(e=><div className="history-row" key={e.id}><div className="history-icon"><ClipboardCheck/></div><div className="history-main"><strong>{e.subjectCode} · {e.subjectTitle}</strong><span>{e.faculty}</span><small>Submitted {new Date(e.submittedAt).toLocaleString()}</small></div><div className="average-score"><strong>{e.average.toFixed(2)}</strong><span>Average rating</span></div></div>)}
    {sorted.length===0&&<div className="empty-state"><ClipboardCheck/><h3>No evaluations submitted yet</h3><p>Once you submit an evaluation, it will be listed here.</p></div>}
  </div></>;
}

export default App;
