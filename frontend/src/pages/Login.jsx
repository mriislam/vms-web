import {
  LockOutlined, ReloadOutlined, UserOutlined,
} from '@ant-design/icons';
import { Button, Form, Input, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLogin } from '../hooks/useAuth';
import { useAuthStore } from '../stores/authStore';
import apiClient from '../services/apiClient';

const { Text } = Typography;
const YEAR = new Date().getFullYear();

const DEMO = [
  { role: 'Admin',       username: 'admin',      password: 'admin123', color: '#f43f5e' },
  { role: 'Manager',     username: 'manager',    password: 'admin123', color: '#f59e0b' },
  { role: 'Operator',    username: 'operator',   password: 'admin123', color: '#6366f1' },
  { role: 'Super Admin', username: 'superadmin', password: 'admin123', color: '#7c3aed', superAdmin: true },
];

// ── Animated background particles ────────────────────────────────────────────
function Particles() {
  const dots = Array.from({ length: 28 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    r: 1 + Math.random() * 2.5, delay: Math.random() * 4,
    dur: 3 + Math.random() * 4,
  }));
  return (
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
      {dots.map(d => (
        <circle key={d.id} cx={`${d.x}%`} cy={`${d.y}%`} r={d.r}
          fill="rgba(255,255,255,0.18)">
          <animate attributeName="opacity" values="0.1;0.5;0.1"
            dur={`${d.dur}s`} repeatCount="indefinite" begin={`${d.delay}s`} />
          <animate attributeName="cy" values={`${d.y}%;${d.y - 3}%;${d.y}%`}
            dur={`${d.dur + 2}s`} repeatCount="indefinite" begin={`${d.delay}s`} />
        </circle>
      ))}
    </svg>
  );
}

// ── 6-digit OTP Input — individual boxes ─────────────────────────────────────
function OtpInput({ value, onChange }) {
  const inputs = useRef([]);
  const digits = (value || '').split('').concat(Array(6).fill('')).slice(0, 6);

  function handleKey(i, e) {
    const d = e.key;
    if (d === 'Backspace') {
      const next = digits.map((v, j) => j === i ? '' : v).join('');
      onChange(next);
      if (i > 0 && !digits[i]) inputs.current[i - 1]?.focus();
    } else if (/^\d$/.test(d)) {
      const next = digits.map((v, j) => j === i ? d : v).join('');
      onChange(next);
      if (i < 5) setTimeout(() => inputs.current[i + 1]?.focus(), 10);
    } else if (d !== 'Tab') {
      e.preventDefault();
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted.padEnd(6, '').slice(0, 6));
    setTimeout(() => inputs.current[Math.min(pasted.length, 5)]?.focus(), 10);
    e.preventDefault();
  }

  return (
    <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          value={d}
          type="text"
          inputMode="numeric"
          onChange={e => {
            const v = e.target.value.replace(/\D/g,'').slice(-1);
            if (!v) return;
            const next = digits.map((dv, j) => j === i ? v : dv).join('');
            onChange(next);
            if (i < 5) setTimeout(() => inputs.current[i + 1]?.focus(), 10);
          }}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          maxLength={1}
          style={{
            width:48, height:56, textAlign:'center', fontSize:24, fontWeight:900,
            borderRadius:12,
            border: d ? '2px solid #6366f1' : '2px solid #e2e8f0',
            background: d ? 'linear-gradient(135deg,#eef1ff,#f5f3ff)' : '#fff',
            color:'#6366f1', outline:'none', transition:'all 0.15s',
            boxShadow: d ? '0 0 0 4px rgba(99,102,241,0.12)' : '0 1px 3px rgba(0,0,0,0.06)',
            caretColor:'transparent', cursor:'text',
            fontFamily:"'Inter','Roboto',monospace",
          }}
        />
      ))}
    </div>
  );
}

// ── Main login page ───────────────────────────────────────────────────────────
export default function LoginPage() {
  const [form]    = Form.useForm();
  const [step,    setStep]    = useState('credentials'); // 'credentials' | 'mfa'
  const [mfaData, setMfaData] = useState(null);          // { mfaToken, username }
  const [otp,     setOtp]     = useState('');
  const [mfaErr,  setMfaErr]  = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [selected,  setSelected]  = useState(null);
  const { mutate: login, isPending, error } = useLogin();
  const setAuth  = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const { tenantSlug } = useParams(); // present when route is /:tenantSlug/login

  // Reset OTP when step changes
  useEffect(() => { if (step === 'mfa') setOtp(''); }, [step]);

  // Quick-pick demo user
  const pick = (u) => {
    setSelected(u.role);
    form.setFieldsValue({ username: u.username, password: u.password });
  };

  // Step 1: credentials
  async function onFinish(vals) {
    const isSuperAdminLogin = selected === 'Super Admin' || (!tenantSlug && !vals.tenantSlug);
    const payload = { ...vals, tenantSlug: isSuperAdminLogin ? null : (tenantSlug ?? null) };
    try {
      const res  = await apiClient.post('/auth/login', payload);
      const data = res.data?.data ?? res.data;
      if (data?.mfaRequired) {
        setMfaData({ mfaToken: data.mfaToken, username: data.username });
        setStep('mfa');
      } else if (data?.token) {
        setAuth({ token: data.token, username: data.username, fullName: data.fullName,
          role: data.role, tenantId: data.tenantId, tenantSlug: data.tenantSlug, tenantName: data.tenantName });
        const slug = data.tenantSlug || tenantSlug;
        navigate(slug ? `/${slug}/dashboard` : '/super-admin');
      } else {
        login(payload);
      }
    } catch {
      login(payload);
    }
  }

  // Step 2: TOTP verify
  async function verifyMfa() {
    if (otp.length !== 6) { setMfaErr('Enter the 6-digit code from your authenticator app'); return; }
    setMfaLoading(true); setMfaErr('');
    try {
      const res  = await apiClient.post('/auth/verify-mfa',
        { mfaToken: mfaData.mfaToken, code: otp });
      const data = res.data?.data;
      if (data?.token) {
        setAuth({ token: data.token, username: data.username ?? mfaData.username,
          fullName: data.fullName, role: data.role, tenantId: data.tenantId,
          tenantSlug: data.tenantSlug, tenantName: data.tenantName });
        const slug = data.tenantSlug || tenantSlug;
        navigate(slug ? `/${slug}/dashboard` : '/super-admin');
      } else {
        setMfaErr('Verification failed. Please try again.');
      }
    } catch (e) {
      const msg = e?.response?.data?.message ?? 'Invalid code. Try again.';
      // Session expired → go back to login step to get a fresh session
      if (msg.includes('expired') || msg.includes('session')) {
        setStep('credentials'); setMfaData(null); setOtp('');
        setMfaErr('');
      } else {
        setMfaErr(msg);
        setOtp(''); // clear so user can re-enter fresh code
        setTimeout(() => document.querySelector('input[inputmode="numeric"]')?.focus(), 100);
      }
    } finally { setMfaLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:"'Inter','Roboto','Segoe UI',sans-serif" }}>

      {/* ════ LEFT PANEL — Hero ════════════════════════════════════════════ */}
      <div style={{
        flex:1, minWidth:0,
        background:'linear-gradient(145deg,#060d1f 0%,#0c1a3a 35%,#0a1e42 65%,#09143a 100%)',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        padding:'48px 40px', position:'relative', overflow:'hidden',
      }}>
        {/* Grid */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none',
          backgroundImage:'linear-gradient(rgba(99,102,241,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.06) 1px,transparent 1px)',
          backgroundSize:'52px 52px' }} />
        {/* Glow orbs */}
        <div style={{ position:'absolute', top:'8%',  left:'5%',   width:350, height:350, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'10%', right:'5%', width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle,rgba(16,185,129,0.14) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:'45%', right:'20%',  width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle,rgba(6,182,212,0.1) 0%,transparent 70%)',  pointerEvents:'none' }} />
        <Particles />

        {/* ── NEXVMS Logo + brand ─────────────────────────────────────── */}
        <div style={{ position:'relative', zIndex:1, textAlign:'center', marginBottom:36 }}>
          {/* Logo */}
          <div style={{
            width:120, height:120, borderRadius:'50%', margin:'0 auto 20px',
            background:'rgba(255,255,255,0.06)',
            border:'2px solid rgba(255,255,255,0.12)',
            backdropFilter:'blur(12px)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 8px 40px rgba(99,102,241,0.35), 0 0 0 8px rgba(99,102,241,0.08)',
          }}>
            <img src="/nexvms-logo.svg" alt="NEXVMS"
              style={{ width:90, height:90, objectFit:'contain',
                filter:'drop-shadow(0 4px 16px rgba(16,185,129,0.5))' }} />
          </div>

          {/* NEXVMS wordmark */}
          <div style={{
            fontSize:42, fontWeight:900, letterSpacing:'-0.04em',
            background:'linear-gradient(135deg,#a5b4fc 0%,#67e8f9 50%,#6ee7b7 100%)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            lineHeight:1, marginBottom:6,
          }}>NEXVMS</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.45)', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:20 }}>
            Fleet Management System
          </div>

          <div style={{ fontSize:22, fontWeight:700, color:'#fff', lineHeight:1.4, letterSpacing:'-0.02em', marginBottom:6 }}>
            Smart Fleet Management
          </div>
          <div style={{
            fontSize:22, fontWeight:700, lineHeight:1.4, letterSpacing:'-0.02em',
            background:'linear-gradient(90deg,#818cf8,#22d3ee,#34d399)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            marginBottom:16,
          }}>
            for Modern Operations
          </div>
          <Text style={{ color:'rgba(255,255,255,0.4)', fontSize:13 }}>
            Track · Dispatch · Maintain · Analyse
          </Text>
        </div>

        {/* ── Stats row ───────────────────────────────────────────────── */}
        <div style={{ position:'relative', zIndex:1, display:'flex', gap:16, marginBottom:28 }}>
          {[
            { icon:'🚗', label:'Active Vehicles', value:'25+', color:'#34d399' },
            { icon:'⚡', label:'Live Dispatches',  value:'11',  color:'#818cf8' },
            { icon:'📊', label:'Fleet Uptime',     value:'99%', color:'#67e8f9' },
          ].map(s => (
            <div key={s.label} style={{
              background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
              borderRadius:16, padding:'14px 20px', textAlign:'center', backdropFilter:'blur(8px)',
            }}>
              <div style={{ fontSize:22 }}>{s.icon}</div>
              <div style={{ fontSize:22, fontWeight:900, color:s.color, lineHeight:1.2 }}>{s.value}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Feature pills ───────────────────────────────────────────── */}
        <div style={{ position:'relative', zIndex:1, display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center', marginBottom:28 }}>
          {[
            { icon:'📍', label:'Live GPS Tracking' },
            { icon:'🔐', label:'2FA Security' },
            { icon:'🔧', label:'Maintenance Alerts' },
            { icon:'📋', label:'Dispatch Management' },
          ].map(f => (
            <div key={f.label} style={{
              display:'flex', alignItems:'center', gap:6,
              background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
              borderRadius:20, padding:'5px 14px',
            }}>
              <span style={{ fontSize:12 }}>{f.icon}</span>
              <Text style={{ color:'rgba(255,255,255,0.55)', fontSize:11 }}>{f.label}</Text>
            </div>
          ))}
        </div>

        <Text style={{ position:'relative', zIndex:1, color:'rgba(255,255,255,0.2)', fontSize:11 }}>
          © {YEAR} Nexdecade Technology (Pvt.) Ltd. All rights reserved.
        </Text>
      </div>

      {/* ════ RIGHT PANEL — Form ═══════════════════════════════════════════ */}
      <div style={{
        width:480, flexShrink:0,
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        background:'#f8faff', padding:'48px 44px', position:'relative',
      }}>
        {/* Gradient top bar */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:4,
          background:'linear-gradient(90deg,#6366f1,#06b6d4,#10b981)' }} />

        <div style={{ width:'100%', maxWidth:380 }}>

          {/* Logo top */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
            <img src="/nexvms-logo.svg" alt="NEXVMS"
              style={{ width:44, height:44, objectFit:'contain',
                filter:'drop-shadow(0 2px 8px rgba(16,185,129,0.35))' }} />
            <div>
              <div style={{ fontSize:18, fontWeight:900, color:'#6366f1', letterSpacing:'-0.03em' }}>NEXVMS</div>
              <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'0.1em', textTransform:'uppercase' }}>Fleet Manager</div>
            </div>
          </div>

          {/* ── STEP 1: Credentials ──────────────────────────────────── */}
          {step === 'credentials' && (
            <>
              <div style={{ marginBottom:24 }}>
                <div style={{ fontSize:24, fontWeight:900, color:'#1e293b', letterSpacing:'-0.03em', marginBottom:4 }}>
                  Welcome back 👋
                </div>
                <Text style={{ color:'#64748b', fontSize:13 }}>Sign in to your NEXVMS account</Text>
              </div>

              {/* Quick role buttons */}
              <div style={{ marginBottom:22 }}>
                <Text style={{ fontSize:10, fontWeight:700, color:'#94a3b8', letterSpacing:'0.1em', textTransform:'uppercase', display:'block', marginBottom:10 }}>
                  Quick Login
                </Text>
                <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                  {DEMO.filter(u => !u.superAdmin).map(u => (
                    <button key={u.role} onClick={() => pick(u)} style={{
                      flex:1, padding:'10px 6px', borderRadius:12, cursor:'pointer',
                      textAlign:'center', transition:'all 0.18s',
                      background: selected === u.role ? u.color : '#fff',
                      border: `2px solid ${selected === u.role ? u.color : '#e2e8f0'}`,
                      boxShadow: selected === u.role ? `0 4px 14px ${u.color}44` : '0 1px 3px rgba(0,0,0,0.06)',
                      transform: selected === u.role ? 'translateY(-2px)' : 'none',
                      outline:'none',
                    }}>
                      <div style={{ fontWeight:800, fontSize:12, color: selected === u.role ? '#fff' : '#374151' }}>{u.role}</div>
                    </button>
                  ))}
                </div>
                {DEMO.filter(u => u.superAdmin).map(u => (
                  <button key={u.role} onClick={() => pick(u)} style={{
                    width:'100%', padding:'8px 12px', borderRadius:12, cursor:'pointer',
                    textAlign:'center', transition:'all 0.18s', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    background: selected === u.role ? `linear-gradient(135deg,${u.color},#6366f1)` : '#faf5ff',
                    border: `2px solid ${selected === u.role ? u.color : '#e9d5ff'}`,
                    boxShadow: selected === u.role ? `0 4px 14px ${u.color}44` : '0 1px 3px rgba(124,58,237,0.08)',
                    transform: selected === u.role ? 'translateY(-2px)' : 'none',
                    outline:'none',
                  }}>
                    <span style={{ fontSize:14 }}>👑</span>
                    <div style={{ fontWeight:800, fontSize:12, color: selected === u.role ? '#fff' : u.color }}>{u.role}</div>
                  </button>
                ))}
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                <div style={{ flex:1, height:1, background:'#e2e8f0' }} />
                <Text style={{ color:'#94a3b8', fontSize:12 }}>or enter credentials</Text>
                <div style={{ flex:1, height:1, background:'#e2e8f0' }} />
              </div>

              <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off" requiredMark={false}>
                <Form.Item name="username" rules={[{ required:true, message:'Username required' }]} style={{ marginBottom:14 }}>
                  <Input
                    prefix={<UserOutlined style={{ color:'#94a3b8' }} />}
                    placeholder="Username"
                    size="large"
                    style={{ borderRadius:12, border:'2px solid #e2e8f0', background:'#fff', fontSize:14 }}
                  />
                </Form.Item>
                <Form.Item name="password" rules={[{ required:true, message:'Password required' }]} style={{ marginBottom: error ? 10 : 22 }}>
                  <Input.Password
                    prefix={<LockOutlined style={{ color:'#94a3b8' }} />}
                    placeholder="Password"
                    size="large"
                    style={{ borderRadius:12, border:'2px solid #e2e8f0', background:'#fff', fontSize:14 }}
                  />
                </Form.Item>

                {error && (
                  <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:10,
                    background:'#fff1f2', border:'1px solid #fca5a5', color:'#e11d48', fontSize:13 }}>
                    ⚠️ Invalid credentials. Please try again.
                  </div>
                )}

                <Button type="primary" htmlType="submit" size="large" block loading={isPending}
                  style={{
                    height:50, borderRadius:12, fontWeight:800, fontSize:15,
                    background:'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)',
                    border:'none', boxShadow:'0 4px 20px rgba(99,102,241,0.4)',
                    letterSpacing:'0.01em',
                  }}>
                  Sign In →
                </Button>
              </Form>

              {/* 2FA notice */}
              <div style={{ marginTop:14, display:'flex', alignItems:'center', gap:8,
                background:'rgba(99,102,241,0.05)', border:'1px solid rgba(99,102,241,0.15)',
                borderRadius:10, padding:'8px 12px' }}>
                <span style={{ fontSize:14 }}>🔐</span>
                <Text style={{ fontSize:12, color:'#6366f1' }}>
                  Accounts with 2FA enabled will require a Google Authenticator code after login.
                </Text>
              </div>
            </>
          )}

          {/* ── STEP 2: 2FA TOTP ─────────────────────────────────────── */}
          {step === 'mfa' && (
            <div>
              {/* Header */}
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{
                  width:72, height:72, borderRadius:20, margin:'0 auto 14px',
                  background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:'0 8px 24px rgba(99,102,241,0.35)', fontSize:32,
                }}>🔐</div>
                <div style={{ fontSize:20, fontWeight:900, color:'#1e293b', letterSpacing:'-0.02em' }}>
                  Two-Factor Verification
                </div>
                <Text style={{ color:'#64748b', fontSize:13, display:'block', marginTop:6 }}>
                  Signing in as <strong style={{ color:'#6366f1' }}>{mfaData?.username}</strong>
                </Text>
              </div>

              {/* Instruction card */}
              <div style={{
                background:'rgba(99,102,241,0.04)', border:'1px solid rgba(99,102,241,0.15)',
                borderRadius:12, padding:'12px 16px', marginBottom:20,
                display:'flex', alignItems:'center', gap:10,
              }}>
                <span style={{ fontSize:20 }}>📱</span>
                <Text style={{ fontSize:13, color:'#475569' }}>
                  Open <strong>Google Authenticator</strong> → find <strong>NEXVMS</strong> → enter the 6-digit code below
                </Text>
              </div>

              {/* OTP boxes */}
              <OtpInput value={otp} onChange={setOtp} />

              {/* Code refreshes hint */}
              <div style={{ textAlign:'center', marginTop:10, marginBottom:4 }}>
                <Text style={{ fontSize:11, color:'#94a3b8' }}>
                  Code refreshes every 30 seconds — if expired, wait for the next one
                </Text>
              </div>

              {/* Error */}
              {mfaErr && (
                <div style={{ margin:'12px 0', padding:'10px 14px', borderRadius:10,
                  background:'#fff1f2', border:'1px solid #fca5a5', color:'#e11d48', fontSize:13,
                  display:'flex', alignItems:'center', gap:8 }}>
                  <span>⚠️</span> {mfaErr}
                </div>
              )}

              {/* Verify button */}
              <Button type="primary" size="large" block
                loading={mfaLoading}
                onClick={verifyMfa}
                disabled={otp.length !== 6}
                style={{
                  height:50, borderRadius:12, fontWeight:800, fontSize:15,
                  background: otp.length === 6
                    ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                    : undefined,
                  border:'none',
                  boxShadow: otp.length === 6 ? '0 4px 20px rgba(99,102,241,0.4)' : undefined,
                  marginTop:14,
                }}>
                Verify &amp; Sign In →
              </Button>

              <button
                onClick={() => { setStep('credentials'); setMfaData(null); setOtp(''); }}
                style={{ marginTop:14, background:'none', border:'none', cursor:'pointer',
                  color:'#94a3b8', fontSize:13, display:'flex', alignItems:'center', gap:6, margin:'14px auto 0' }}>
                <ReloadOutlined /> Back to login
              </button>

              {/* Timer hint */}
              <div style={{ marginTop:16, padding:'8px 12px', borderRadius:10,
                background:'rgba(99,102,241,0.05)', border:'1px solid rgba(99,102,241,0.12)' }}>
                <Text style={{ fontSize:11, color:'#6366f1' }}>
                  💡 Code refreshes every 30 seconds. If expired, wait for the next one.
                </Text>
              </div>
            </div>
          )}

          {/* Copyright */}
          <div style={{ position:'absolute', bottom:20, left:0, right:0, textAlign:'center' }}>
            <Text style={{ color:'#d1d5db', fontSize:11 }}>
              © {YEAR} Nexdecade Technology (Pvt.) Ltd.
            </Text>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="flex:1"][style*="min-width:0"] { display: none !important; }
          div[style*="width:480px"] { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
