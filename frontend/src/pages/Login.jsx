import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { useLogin } from '../hooks/useAuth';

const { Title, Text } = Typography;

const YEAR = new Date().getFullYear();

const DEMO_USERS = [
  { role: 'Admin',    username: 'admin',    password: 'admin123',    color: '#ff4d4f', desc: 'Full system access' },
  { role: 'Manager',  username: 'manager',  password: 'manager123',  color: '#fa8c16', desc: 'Fleet & reports' },
  { role: 'Operator', username: 'operator', password: 'operator123', color: '#1677ff', desc: 'Dispatch & logs' },
];

/* ── Inline SVG fleet illustration ─────────────────────────── */
function FleetIllustration() {
  return (
    <svg viewBox="0 0 520 420" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 480 }}>
      {/* Road */}
      <ellipse cx="260" cy="370" rx="230" ry="22" fill="rgba(255,255,255,0.06)" />
      <rect x="40" y="355" width="440" height="14" rx="7" fill="rgba(255,255,255,0.1)" />
      {/* Road dashes */}
      {[80,150,220,290,360].map((x) => (
        <rect key={x} x={x} y="360" width="30" height="4" rx="2" fill="rgba(255,255,255,0.25)" />
      ))}

      {/* ── Big truck (center) ───────────────────────────────── */}
      {/* Trailer */}
      <rect x="120" y="290" width="180" height="64" rx="8" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      {/* Cab */}
      <rect x="300" y="298" width="80" height="56" rx="8" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      {/* Cab window */}
      <rect x="310" y="306" width="34" height="24" rx="4" fill="rgba(100,180,255,0.45)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      {/* Windshield shine */}
      <rect x="313" y="309" width="10" height="6" rx="2" fill="rgba(255,255,255,0.4)" />
      {/* Exhaust */}
      <rect x="374" y="280" width="6" height="22" rx="3" fill="rgba(255,255,255,0.2)" />
      {/* Smoke puffs */}
      {[0,1,2].map((i) => (
        <circle key={i} cx={377 + i * 5} cy={268 - i * 10} r={4 + i * 2} fill="rgba(255,255,255,0.06)" />
      ))}
      {/* Headlight */}
      <circle cx="382" cy="334" r="5" fill="#ffd666" opacity="0.9" />
      <ellipse cx="404" cy="334" rx="16" ry="5" fill="rgba(255,214,102,0.15)" />
      {/* Wheels */}
      {[155, 220, 285, 320, 355].map((x) => (
        <g key={x}>
          <circle cx={x} cy="356" r="13" fill="#1a1f2e" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
          <circle cx={x} cy="356" r="6"  fill="rgba(255,255,255,0.12)" />
          <circle cx={x} cy="356" r="2"  fill="rgba(255,255,255,0.4)" />
        </g>
      ))}
      {/* VMS label on trailer */}
      <rect x="155" y="312" width="80" height="22" rx="5" fill="rgba(22,119,255,0.3)" stroke="rgba(22,119,255,0.6)" strokeWidth="1" />
      <text x="195" y="327" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Roboto, sans-serif">VMS FLEET</text>

      {/* ── Small van (left) ────────────────────────────────── */}
      <rect x="28"  y="314" width="72" height="44" rx="6" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
      <rect x="32"  y="320" width="28" height="18" rx="3" fill="rgba(100,180,255,0.35)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <circle cx="50"  cy="358" r="9"  fill="#1a1f2e" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
      <circle cx="50"  cy="358" r="4"  fill="rgba(255,255,255,0.15)" />
      <circle cx="84"  cy="358" r="9"  fill="#1a1f2e" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
      <circle cx="84"  cy="358" r="4"  fill="rgba(255,255,255,0.15)" />
      {/* headlight */}
      <circle cx="98" cy="336" r="4" fill="#ffd666" opacity="0.8" />

      {/* ── Pickup (right) ──────────────────────────────────── */}
      <rect x="415" y="318" width="68" height="40" rx="6" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
      <rect x="418" y="324" width="26" height="16" rx="3" fill="rgba(100,180,255,0.35)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <circle cx="432" cy="358" r="9"  fill="#1a1f2e" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
      <circle cx="432" cy="358" r="4"  fill="rgba(255,255,255,0.15)" />
      <circle cx="464" cy="358" r="9"  fill="#1a1f2e" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
      <circle cx="464" cy="358" r="4"  fill="rgba(255,255,255,0.15)" />

      {/* ── GPS pin (center-top) ─────────────────────────────── */}
      <circle cx="260" cy="90"  r="28" fill="rgba(22,119,255,0.2)"  stroke="rgba(22,119,255,0.5)"  strokeWidth="1.5" />
      <circle cx="260" cy="90"  r="16" fill="rgba(22,119,255,0.35)" stroke="rgba(22,119,255,0.7)"  strokeWidth="1.5" />
      <circle cx="260" cy="90"  r="6"  fill="#4096ff" />
      <line   x1="260" y1="106" x2="260" y2="128" stroke="rgba(22,119,255,0.6)" strokeWidth="2" strokeDasharray="4 3" />
      {/* Pulse rings */}
      <circle cx="260" cy="90" r="38" stroke="rgba(22,119,255,0.15)" strokeWidth="1" fill="none" />
      <circle cx="260" cy="90" r="50" stroke="rgba(22,119,255,0.08)" strokeWidth="1" fill="none" />

      {/* ── Route path ──────────────────────────────────────── */}
      <path d="M 80 250 Q 160 180 260 160 Q 360 140 420 200" stroke="rgba(22,119,255,0.3)" strokeWidth="2" strokeDasharray="8 5" fill="none" />
      <circle cx="80"  cy="250" r="5" fill="rgba(82,196,26,0.8)"  stroke="white" strokeWidth="1.5" />
      <circle cx="420" cy="200" r="5" fill="rgba(255,77,79,0.8)"  stroke="white" strokeWidth="1.5" />

      {/* ── Dashboard cards (top corners) ───────────────────── */}
      {/* Left card */}
      <rect x="30"  y="50" width="110" height="60" rx="10" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <circle cx="52" cy="72" r="10" fill="rgba(82,196,26,0.25)" stroke="rgba(82,196,26,0.5)" strokeWidth="1" />
      <text x="52" y="76" textAnchor="middle" fill="#52c41a" fontSize="10" fontWeight="700">✓</text>
      <rect x="68"  y="64" width="58" height="7" rx="3" fill="rgba(255,255,255,0.15)" />
      <rect x="68"  y="76" width="40" height="5" rx="2" fill="rgba(255,255,255,0.08)" />
      <text x="52" y="100" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9">Active</text>
      <text x="85" y="100" fill="#52c41a" fontSize="13" fontWeight="800">34</text>

      {/* Right card */}
      <rect x="382" y="50" width="110" height="60" rx="10" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <circle cx="404" cy="72" r="10" fill="rgba(250,140,22,0.25)" stroke="rgba(250,140,22,0.5)" strokeWidth="1" />
      <text x="404" y="76" textAnchor="middle" fill="#fa8c16" fontSize="10">⛽</text>
      <rect x="420"  y="64" width="58" height="7" rx="3" fill="rgba(255,255,255,0.15)" />
      <rect x="420"  y="76" width="40" height="5" rx="2" fill="rgba(255,255,255,0.08)" />
      <text x="404" y="100" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9">Fuel</text>
      <text x="435" y="100" fill="#fa8c16" fontSize="13" fontWeight="800">182k</text>

      {/* ── Speed / stat chip ───────────────────────────────── */}
      <rect x="192" y="200" width="136" height="44" rx="10" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <text x="260" y="220" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" letterSpacing="1">FLEET UPTIME</text>
      <text x="260" y="236" textAnchor="middle" fill="white" fontSize="16" fontWeight="800">94.7%</text>

      {/* Floating dots decoration */}
      {[[60,160],[460,260],[100,300],[430,120],[180,40],[340,30]].map(([cx,cy],i) => (
        <circle key={i} cx={cx} cy={cy} r={2+i%2} fill={`rgba(255,255,255,${0.06+i*0.02})`} />
      ))}
    </svg>
  );
}

export default function LoginPage() {
  const [form] = Form.useForm();
  const [selected, setSelected] = useState(null);
  const { mutate: login, isPending, error } = useLogin();

  const pick = (user) => {
    setSelected(user.role);
    form.setFieldsValue({ username: user.username, password: user.password });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Roboto','Segoe UI',sans-serif" }}>

      {/* ── Left panel — illustration ───────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #0a1628 0%, #0d2137 40%, #0a1f3a 70%, #10153a 100%)',
        padding: '48px 40px',
        position: 'relative',
        overflow: 'hidden',
        minWidth: 0,
      }}>
        {/* Background grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'linear-gradient(rgba(22,119,255,0.06) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(22,119,255,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
        {/* Glow orbs */}
        <div style={{ position:'absolute', top:'10%',  left:'10%',  width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(22,119,255,0.14) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'15%', right:'5%',   width:240, height:240, borderRadius:'50%', background:'radial-gradient(circle, rgba(114,46,209,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:'50%',  right:'20%',  width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle, rgba(82,196,26,0.08) 0%, transparent 70%)',   pointerEvents:'none' }} />

        {/* Brand */}
        <div style={{ position:'relative', zIndex:1, textAlign:'center', marginBottom: 32 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:12, marginBottom:16 }}>
            <div style={{
              width:48, height:48, borderRadius:12,
              background:'linear-gradient(135deg,#1677ff,#722ed1)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 0 24px rgba(22,119,255,0.5)',
              fontSize:22,
            }}>🚛</div>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontSize:20, fontWeight:800, color:'#fff', lineHeight:1.2, letterSpacing:'-0.02em' }}>VMS</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Fleet Manager</div>
            </div>
          </div>

          <div style={{
            fontSize:26, fontWeight:800, color:'#fff', lineHeight:1.3,
            letterSpacing:'-0.02em', marginBottom:8,
          }}>
            Smart Fleet Management<br />
            <span style={{
              background:'linear-gradient(90deg,#4096ff,#9254de,#52c41a)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            }}>
              for Modern Operations
            </span>
          </div>
          <Text style={{ color:'rgba(255,255,255,0.45)', fontSize:13 }}>
            Track · Dispatch · Maintain · Analyse
          </Text>
        </div>

        {/* Illustration */}
        <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:480 }}>
          <FleetIllustration />
        </div>

        {/* Feature pills */}
        <div style={{ position:'relative', zIndex:1, display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center', marginTop:24 }}>
          {[
            { icon:'📍', label:'Live GPS Tracking' },
            { icon:'📊', label:'Fleet Analytics' },
            { icon:'🔧', label:'Maintenance Alerts' },
            { icon:'📋', label:'Dispatch Management' },
          ].map((f) => (
            <div key={f.label} style={{
              display:'flex', alignItems:'center', gap:6,
              background:'rgba(255,255,255,0.06)',
              border:'1px solid rgba(255,255,255,0.1)',
              borderRadius:20, padding:'5px 12px',
            }}>
              <span style={{ fontSize:12 }}>{f.icon}</span>
              <Text style={{ color:'rgba(255,255,255,0.6)', fontSize:11 }}>{f.label}</Text>
            </div>
          ))}
        </div>

        {/* Copyright */}
        <div style={{ position:'relative', zIndex:1, marginTop:32, textAlign:'center' }}>
          <Text style={{ color:'rgba(255,255,255,0.25)', fontSize:11 }}>
            © {YEAR} Nexdecade Technology (Pvt.) Ltd. All rights reserved.
          </Text>
        </div>
      </div>

      {/* ── Right panel — form ──────────────────────────────── */}
      <div style={{
        width: 460,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: '48px 44px',
        position: 'relative',
      }}>
        {/* Top accent bar */}
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:4,
          background:'linear-gradient(90deg, #1677ff, #722ed1, #52c41a)',
        }} />

        <div style={{ width:'100%', maxWidth:360 }}>
          {/* Heading */}
          <div style={{ marginBottom:32 }}>
            <Title level={3} style={{ margin:0, color:'#0a1628', fontWeight:800, fontSize:24, letterSpacing:'-0.02em' }}>
              Welcome back 👋
            </Title>
            <Text style={{ color:'#6b7280', fontSize:13 }}>Sign in to your VMS account</Text>
          </div>

          {/* Quick role buttons */}
          <div style={{ marginBottom:28 }}>
            <Text style={{ fontSize:11, fontWeight:600, color:'#9ca3af', letterSpacing:'0.08em', textTransform:'uppercase', display:'block', marginBottom:10 }}>
              Quick Login
            </Text>
            <div style={{ display:'flex', gap:8 }}>
              {DEMO_USERS.map((u) => (
                <button
                  key={u.role}
                  onClick={() => pick(u)}
                  style={{
                    flex:1, padding:'10px 6px', borderRadius:10, cursor:'pointer',
                    textAlign:'center', transition:'all 0.18s',
                    background: selected === u.role ? u.color : '#fff',
                    border: selected === u.role ? `2px solid ${u.color}` : '2px solid #e5e7eb',
                    boxShadow: selected === u.role ? `0 4px 14px ${u.color}40` : '0 1px 3px rgba(0,0,0,0.06)',
                    transform: selected === u.role ? 'translateY(-2px)' : 'none',
                    outline:'none',
                  }}
                >
                  <div style={{ fontWeight:700, fontSize:12, color: selected === u.role ? '#fff' : '#374151' }}>{u.role}</div>
                  <div style={{ fontSize:10, color: selected === u.role ? 'rgba(255,255,255,0.8)' : '#9ca3af', marginTop:2 }}>{u.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
            <div style={{ flex:1, height:1, background:'#e5e7eb' }} />
            <Text style={{ color:'#9ca3af', fontSize:12 }}>or enter credentials</Text>
            <div style={{ flex:1, height:1, background:'#e5e7eb' }} />
          </div>

          {/* Form */}
          <Form form={form} layout="vertical" onFinish={(v) => login(v)} autoComplete="off" requiredMark={false}>
            <Form.Item name="username" rules={[{ required:true, message:'Username is required' }]} style={{ marginBottom:14 }}>
              <Input
                prefix={<UserOutlined style={{ color:'#9ca3af' }} />}
                placeholder="Username"
                size="large"
                style={{
                  borderRadius:10, border:'2px solid #e5e7eb',
                  background:'#fff', fontSize:14,
                  transition:'border 0.2s',
                }}
              />
            </Form.Item>

            <Form.Item name="password" rules={[{ required:true, message:'Password is required' }]} style={{ marginBottom: error ? 8 : 24 }}>
              <Input.Password
                prefix={<LockOutlined style={{ color:'#9ca3af' }} />}
                placeholder="Password"
                size="large"
                style={{
                  borderRadius:10, border:'2px solid #e5e7eb',
                  background:'#fff', fontSize:14,
                }}
              />
            </Form.Item>

            {error && (
              <div style={{
                marginBottom:16, padding:'10px 14px', borderRadius:8,
                background:'#fff1f0', border:'1px solid #ffa39e',
                color:'#cf1322', fontSize:13,
              }}>
                Invalid credentials. Please try again.
              </div>
            )}

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={isPending}
              style={{
                height:48, borderRadius:10, fontWeight:700, fontSize:15,
                background:'linear-gradient(90deg, #1677ff 0%, #722ed1 100%)',
                border:'none',
                boxShadow:'0 4px 20px rgba(22,119,255,0.35)',
                letterSpacing:'0.02em',
              }}
            >
              Sign In →
            </Button>
          </Form>

          {/* Credential hint */}
          <div style={{
            marginTop:20, padding:'12px 14px', borderRadius:10,
            background:'linear-gradient(135deg, #eff6ff, #f5f3ff)',
            border:'1px solid #dbeafe',
          }}>
            <Text style={{ fontSize:11, color:'#6b7280', display:'block', marginBottom:4, fontWeight:600 }}>
              Demo credentials
            </Text>
            {DEMO_USERS.map((u) => (
              <Text key={u.role} style={{ fontSize:11, color:'#9ca3af', display:'block' }}>
                <span style={{ color: u.color, fontWeight:600 }}>{u.role}:</span> {u.username} / {u.password}
              </Text>
            ))}
          </div>
        </div>

        {/* Bottom copyright on right panel for small screens */}
        <div style={{ position:'absolute', bottom:20, textAlign:'center', width:'100%' }}>
          <Text style={{ color:'#d1d5db', fontSize:11 }}>
            © {YEAR} Nexdecade Technology (Pvt.) Ltd.
          </Text>
        </div>
      </div>

      {/* ── Responsive: hide left panel on narrow screens ────── */}
      <style>{`
        @media (max-width: 768px) {
          .login-left { display: none !important; }
        }
      `}</style>
    </div>
  );
}
