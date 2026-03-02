
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Palette, Trash, Shield, Check, X, LogOut, AlertTriangle, User, PenLine, Bell, Globe, Crown } from 'lucide-react';
import { ThemeOption } from '../types';

export const Account: React.FC = () => {
  const { state, setTheme, logOut, deleteAccount, updateProfile } = useApp();
  const navigate = useNavigate();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  
  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(state.userName);
  const [tempMotto, setTempMotto] = useState(state.motto);

  // Alerts State
  const [tempAlerts, setTempAlerts] = useState<string[]>(state.alertTimes || []);
  const [newAlertTime, setNewAlertTime] = useState('');

  // Time Zone
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    setTempName(state.userName);
    setTempMotto(state.motto);
  }, [state.userName, state.motto]);

  useEffect(() => {
      setTempAlerts(state.alertTimes || []);
  }, [state.alertTimes]);

  const handleSaveProfile = async () => {
      if (!tempName.trim()) {
          setTempName(state.userName);
          return;
      }
      await updateProfile({ userName: tempName, motto: tempMotto });
      setIsEditing(false);
  };

  const handleAddAlert = () => {
      if (!newAlertTime) return;
      
      if (tempAlerts.length >= 4) {
          alert("You can set a maximum of 4 reminders.");
          return;
      }

      if (tempAlerts.includes(newAlertTime)) {
          setNewAlertTime('');
          return;
      }
      
      // Auto sort from early to late
      const updated = [...tempAlerts, newAlertTime].sort();
      setTempAlerts(updated);
      setNewAlertTime('');
      // Save immediately
      updateProfile({ alertTimes: updated });
  };

  const handleRemoveAlert = (time: string) => {
      const updated = tempAlerts.filter(t => t !== time);
      setTempAlerts(updated);
      // Save immediately
      updateProfile({ alertTimes: updated.length > 0 ? updated : null });
  };

  const formatTime = (time: string) => {
      const [h, m] = time.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${m} ${ampm}`;
  };

  const themes: { id: ThemeOption; name: string; description: string }[] = [
    { id: 'light', name: 'Light', description: 'Clean and bright.' },
    { id: 'dark', name: 'Dark', description: 'Classic dark mode.' },
    { id: 'vintage', name: 'Vintage', description: 'Windows 95 aesthetic.' },
    { id: 'sepia', name: 'Sepia', description: 'Easy on the eyes.' },
    { id: 'cyberpunk', name: 'Cyberpunk', description: 'High contrast neon.' },
    { id: 'nordic', name: 'Nordic', description: 'Cool gray palette.' },
    { id: 'high-contrast', name: 'High Contrast', description: 'Maximum visibility.' },
    { id: 'zen', name: 'Zen', description: 'Monochromatic focus.' },
    { id: 'oled', name: 'OLED', description: 'Pure black to save battery.' },
    { id: 'blue-light', name: 'Blue Light', description: 'Warm filter for sleep.' },
  ];

  const MenuItem: React.FC<{ 
    icon: React.ElementType, 
    label: string, 
    onClick: () => void, 
    danger?: boolean,
    value?: string,
    toggle?: { checked: boolean, onChange: () => void }
  }> = ({ icon: Icon, label, onClick, danger, value, toggle }) => (
    <div 
      onClick={toggle ? undefined : onClick}
      className={`w-full flex items-center justify-between p-4 bg-white dark:bg-ledger-surfaceDark border-b border-gray-100 dark:border-gray-800 last:border-0 last:rounded-b-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${danger ? 'text-red-500' : 'text-ledger-text dark:text-ledger-textDark'}`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className={danger ? "text-red-500" : "text-ledger-muted"} />
        <span className="font-medium">{label}</span>
      </div>
      {toggle ? (
          <div onClick={toggle.onChange} className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${toggle.checked ? 'bg-ledger-accent' : 'bg-gray-300 dark:bg-gray-700'}`}>
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${toggle.checked ? 'left-6' : 'left-1'}`} />
          </div>
      ) : (
          value && <span className="text-sm text-ledger-muted">{value}</span>
      )}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto bg-ledger-bg dark:bg-ledger-bgDark p-6 no-scrollbar">
      <header className="mb-8 flex items-center gap-4">
        <button onClick={() => navigate('/today')} className="p-2 -ml-2 text-ledger-muted hover:text-ledger-text dark:hover:text-white">
            <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-ledger-text dark:text-ledger-textDark">Account</h1>
      </header>
      
      {/* Profile Section */}
      <div className="mb-8 p-4 rounded-xl bg-white dark:bg-ledger-surfaceDark border border-ledger-border dark:border-ledger-borderDark shadow-sm">
          <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-gray-100 dark:bg-white/5 rounded-full text-ledger-muted">
                  <User size={24} />
              </div>
              {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="p-2 text-ledger-muted hover:text-ledger-accent transition-colors">
                      <PenLine size={18} />
                  </button>
              ) : (
                  <div className="flex items-center gap-2">
                      <button onClick={() => { setIsEditing(false); setTempName(state.userName); setTempMotto(state.motto); }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-full">
                          <X size={18} />
                      </button>
                      <button onClick={handleSaveProfile} className="p-2 text-ledger-accent hover:bg-ledger-accent/10 rounded-full">
                          <Check size={18} />
                      </button>
                  </div>
              )}
          </div>
          
          {isEditing ? (
              <div className="space-y-3 mt-2 animate-fade-in">
                  <div>
                      <label className="text-[10px] font-bold uppercase text-ledger-muted">Name</label>
                      <input 
                        value={tempName}
                        onChange={e => setTempName(e.target.value)}
                        className="w-full bg-transparent border-b border-ledger-border dark:border-ledger-borderDark py-1 font-bold text-lg text-ledger-text dark:text-ledger-textDark focus:outline-none focus:border-ledger-accent"
                        autoFocus
                      />
                  </div>
                  <div>
                      <label className="text-[10px] font-bold uppercase text-ledger-muted">Motto</label>
                      <input 
                        value={tempMotto}
                        onChange={e => setTempMotto(e.target.value)}
                        placeholder="Add a motto..."
                        className="w-full bg-transparent border-b border-ledger-border dark:border-ledger-borderDark py-1 text-sm text-ledger-text dark:text-ledger-textDark focus:outline-none focus:border-ledger-accent"
                      />
                  </div>
              </div>
          ) : (
              <div className="mt-2">
                  <h2 className="text-lg font-bold text-ledger-text dark:text-ledger-textDark">{state.userName || 'User'}</h2>
                  {state.motto ? (
                      <p className="text-sm text-ledger-muted mt-1">"{state.motto}"</p>
                  ) : (
                      <p className="text-sm text-ledger-muted/50 mt-1">No motto set</p>
                  )}
              </div>
          )}
      </div>

      <div className="space-y-6 pb-12">
        <section>
             <h3 className="text-xs font-semibold text-ledger-muted uppercase tracking-wider mb-2 ml-1">Settings</h3>
             <div className="rounded-xl border border-ledger-border dark:border-ledger-borderDark shadow-sm">
                <MenuItem 
                    icon={Palette} 
                    label="Appearance" 
                    value={themes.find(t => t.id === state.theme)?.name}
                    onClick={() => setShowThemeModal(true)} 
                />
                <MenuItem 
                    icon={Bell} 
                    label="Notifications" 
                    value={state.alertTimes ? `${state.alertTimes.length} active` : 'Off'}
                    onClick={() => setShowAlertsModal(true)} 
                />
                {/* Time Zone Display */}
                <div className="w-full flex items-center justify-between p-4 bg-white dark:bg-ledger-surfaceDark border-b border-gray-100 dark:border-gray-800 last:border-0 last:rounded-b-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-default">
                    <div className="flex items-center gap-3">
                        <Globe size={18} className="text-ledger-muted" />
                        <span className="font-medium text-ledger-text dark:text-ledger-textDark">Time Zone</span>
                    </div>
                    <span className="text-sm text-ledger-muted truncate max-w-[150px] text-right">{timeZone}</span>
                </div>
             </div>
        </section>

        <section>
            <h3 className="text-xs font-semibold text-ledger-muted uppercase tracking-wider mb-2 ml-1">Data & Privacy</h3>
            <div className="rounded-xl border border-ledger-border dark:border-ledger-borderDark shadow-sm">
                <MenuItem 
                    icon={Crown} 
                    label="Appear in Leaderboard" 
                    onClick={() => {}}
                    toggle={{ 
                        checked: state.isRanked, 
                        onChange: () => updateProfile({ isRanked: !state.isRanked }) 
                    }}
                />
                <MenuItem icon={Shield} label="Privacy Policy" onClick={() => setShowPrivacyModal(true)} />
            </div>
        </section>

        <section>
            <h3 className="text-xs font-semibold text-ledger-muted uppercase tracking-wider mb-2 ml-1">Session</h3>
            <div className="rounded-xl border border-ledger-border dark:border-ledger-borderDark shadow-sm">
                <MenuItem icon={LogOut} label="Log Out" onClick={logOut} />
                <MenuItem icon={Trash} label="Delete Account" onClick={() => setShowDeleteModal(true)} danger />
            </div>
        </section>
      </div>

      <div className="mt-8 text-center pb-6">
        <p className="text-xs text-ledger-muted">Ledger v1.3.2</p>
      </div>

      {/* Theme Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowThemeModal(false)}>
            <div 
                className="w-full max-w-md bg-white dark:bg-[#1A1A1A] rounded-t-2xl p-6 animate-slide-up shadow-2xl max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-ledger-text dark:text-ledger-textDark">Select Theme</h3>
                    <button onClick={() => setShowThemeModal(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-ledger-text dark:text-ledger-textDark">
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-2">
                    {themes.map(t => (
                        <button
                            key={t.id}
                            onClick={() => {
                                setTheme(t.id);
                                setShowThemeModal(false);
                            }}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${state.theme === t.id ? 'border-ledger-accent bg-ledger-accent/5' : 'border-gray-100 dark:border-gray-800 bg-transparent hover:bg-gray-50 dark:hover:bg-white/5'}`}
                        >
                            <div className="text-left">
                                <p className={`font-semibold ${state.theme === t.id ? 'text-ledger-accent' : 'text-ledger-text dark:text-ledger-textDark'}`}>{t.name}</p>
                                <p className="text-xs text-ledger-muted">{t.description}</p>
                            </div>
                            {state.theme === t.id && <Check size={18} className="text-ledger-accent" />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showAlertsModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAlertsModal(false)}>
            <div 
                className="w-full max-w-md bg-white dark:bg-[#1A1A1A] rounded-t-2xl p-6 animate-slide-up shadow-2xl max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-ledger-text dark:text-ledger-textDark">Daily Reminders</h3>
                    <button onClick={() => setShowAlertsModal(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-ledger-text dark:text-ledger-textDark">
                        <X size={16} />
                    </button>
                </div>

                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-ledger-muted">Max 4 reminders.</p>
                        <span className="text-xs font-bold text-ledger-accent bg-ledger-accent/10 px-2 py-1 rounded">
                            {tempAlerts.length} / 4
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="time" 
                            value={newAlertTime}
                            onChange={(e) => setNewAlertTime(e.target.value)}
                            disabled={tempAlerts.length >= 4}
                            className="flex-1 bg-gray-50 dark:bg-white/5 border border-ledger-border dark:border-ledger-borderDark rounded-lg px-3 py-2 text-ledger-text dark:text-ledger-textDark focus:outline-none focus:border-ledger-accent disabled:opacity-50"
                        />
                        <button 
                            onClick={handleAddAlert}
                            disabled={!newAlertTime || tempAlerts.length >= 4}
                            className="bg-ledger-accent text-white px-4 rounded-lg font-medium disabled:opacity-50 min-w-[64px]"
                        >
                            {tempAlerts.length >= 4 ? 'Max' : 'Add'}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    {tempAlerts.length === 0 ? (
                         <div className="text-center py-6 text-ledger-muted text-sm italic border-t border-gray-100 dark:border-gray-800">
                             No reminders set.
                         </div>
                    ) : (
                        tempAlerts.map(time => (
                            <div key={time} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-transparent">
                                <span className="font-mono text-lg text-ledger-text dark:text-ledger-textDark font-medium">
                                    {formatTime(time)}
                                </span>
                                <button 
                                    onClick={() => handleRemoveAlert(time)}
                                    className="p-2 text-ledger-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-full transition-colors"
                                >
                                    <Trash size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowPrivacyModal(false)}>
            <div 
                className="w-full h-[95vh] bg-white dark:bg-[#1A1A1A] rounded-t-2xl p-0 animate-slide-up shadow-2xl overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-lg font-bold text-ledger-text dark:text-ledger-textDark">Privacy Policy</h3>
                    <button onClick={() => setShowPrivacyModal(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-ledger-text dark:text-ledger-textDark">
                        <X size={16} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="prose dark:prose-invert max-w-none text-ledger-text dark:text-ledger-textDark text-sm pb-12">
                        <h1 className="text-xl font-bold mb-4">Privacy Policy (Ledger)</h1>
                        <p className="font-bold mb-2">Effective Date: January 11, 2026</p>
                        
                        <p className="mb-4">
                            This Privacy Policy describes how <strong>Ledger Team</strong> (“<strong>Ledger</strong>,” “<strong>we</strong>,” “<strong>us</strong>,” or “<strong>our</strong>”) collects, uses, discloses, and protects information about users (“<strong>you</strong>”) in connection with the <strong>Ledger</strong> mobile application and any related services (collectively, the “<strong>Service</strong>”).
                        </p>

                        <p className="mb-4">
                            <strong>Operator Contact Information</strong><br/>
                            Ledger Team<br/>
                            Manhattan, New York, United States<br/>
                            Email: <a href="mailto:ledger@metromeshmedia.com" className="text-ledger-accent underline">ledger@metromeshmedia.com</a>
                        </p>

                        <p className="mb-6">By accessing or using the Service, you acknowledge that you have read and understood this Privacy Policy.</p>

                        <h2 className="text-lg font-bold mb-2">1. Scope</h2>
                        <p className="mb-6">This Privacy Policy applies to information we collect through the Service. It does not apply to third-party websites, services, or applications that may be linked to or integrated with the Service. Your use of third-party services is subject to their respective privacy policies and terms.</p>

                        <h2 className="text-lg font-bold mb-2">2. Information We Collect</h2>
                        <p className="mb-2">We collect information in the following categories:</p>
                        <h3 className="font-bold mb-1">2.1 Information You Provide Directly</h3>
                        <ul className="list-disc pl-5 mb-4">
                            <li><strong>Account Information:</strong> such as your email address and login credentials.</li>
                            <li><strong>User Content:</strong> task names, task descriptions, and other content you choose to enter into the Service.</li>
                            <li><strong>Communications:</strong> information you provide when contacting us (e.g., email content).</li>
                        </ul>
                        <h3 className="font-bold mb-1">2.2 Information Collected Automatically</h3>
                        <ul className="list-disc pl-5 mb-4">
                            <li><strong>Usage and Activity Information:</strong> interactions with the Service, including logging activity (e.g., task check/uncheck events), app features used, and timestamps associated with activity.</li>
                            <li><strong>Local Time Information:</strong> we may process your device’s local time and time zone information to support task logging, display, and recordkeeping within the Service.</li>
                            <li><strong>Device and Technical Information:</strong> such as device identifiers, device type, operating system, app version, language settings, and similar technical data.</li>
                            <li><strong>Analytics Information:</strong> we may collect information about how you use the Service through analytics tools (e.g., Google Analytics) to understand usage patterns and improve the Service.</li>
                        </ul>
                        <h3 className="font-bold mb-1">2.3 Information We Do Not Intend to Collect</h3>
                        <p className="mb-6">The Service is not designed to require <strong>precise geolocation</strong>, <strong>payment card information</strong>, or <strong>government-issued identifiers</strong>. If you provide such information voluntarily, it may be processed in accordance with this Privacy Policy.</p>

                        <h2 className="text-lg font-bold mb-2">3. How We Use Information</h2>
                        <p className="mb-2">We may use the information we collect for the following purposes:</p>
                        <ul className="list-disc pl-5 mb-6">
                            <li><strong>Provide and operate the Service</strong>, including account creation, authentication, and enabling task tracking and logging.</li>
                            <li><strong>Maintain and improve the Service</strong>, including debugging, analytics, performance monitoring, and product development.</li>
                            <li><strong>Personalize your experience</strong>, such as displaying task history and logs aligned with your local time.</li>
                            <li><strong>Security and fraud prevention</strong>, including protecting accounts and investigating suspicious activity.</li>
                            <li><strong>Communicate with you</strong>, including responding to inquiries, sending service-related notices, and providing customer support.</li>
                            <li><strong>Comply with legal obligations</strong>, enforce our terms, and protect our rights and the rights of others.</li>
                        </ul>

                        <h2 className="text-lg font-bold mb-2">4. How We Disclose Information</h2>
                        <p className="mb-2">We do not sell your personal information. We may disclose information as follows:</p>
                        <h3 className="font-bold mb-1">4.1 Service Providers and Vendors</h3>
                        <p className="mb-2">We may share information with third-party service providers that help us operate, maintain, and improve the Service, including:</p>
                        <ul className="list-disc pl-5 mb-2">
                            <li><strong>Analytics providers</strong> (e.g., Google Analytics) to understand usage and improve the Service.</li>
                            <li><strong>Infrastructure and hosting providers</strong> (e.g., AWS, as applicable) to store and deliver the Service.</li>
                            <li><strong>Authentication, database, and app infrastructure providers</strong> (e.g., Firebase) to support core app functionality.</li>
                            <li><strong>Email and communications providers</strong> (as applicable) to send service communications and support messages.</li>
                        </ul>
                        <p className="mb-4">These providers are authorized to process information on our behalf only as necessary to provide services to us, and subject to contractual protections where required.</p>
                        <h3 className="font-bold mb-1">4.2 Legal, Safety, and Rights-Related Disclosures</h3>
                        <p className="mb-2">We may disclose information if we believe, in good faith, that such disclosure is necessary to:</p>
                        <ul className="list-disc pl-5 mb-4">
                            <li>comply with applicable law, regulation, legal process, or governmental request;</li>
                            <li>enforce agreements and policies;</li>
                            <li>protect the security or integrity of the Service;</li>
                            <li>protect the rights, property, or safety of Ledger, our users, or others.</li>
                        </ul>
                        <h3 className="font-bold mb-1">4.3 Business Transfers</h3>
                        <p className="mb-6">If we are involved in a merger, acquisition, financing, reorganization, bankruptcy, or sale of assets, information may be disclosed as part of that transaction, subject to appropriate confidentiality protections.</p>

                        <h2 className="text-lg font-bold mb-2">5. Cookies and Similar Technologies</h2>
                        <p className="mb-6">We and our service providers may use cookies, SDKs, pixels, and similar technologies to operate the Service, understand usage, and improve performance. You may be able to limit certain tracking through your device settings or browser settings; however, some features may not function properly if you disable these technologies.</p>

                        <h2 className="text-lg font-bold mb-2">6. Data Retention</h2>
                        <p className="mb-2">We retain information for as long as reasonably necessary to:</p>
                        <ul className="list-disc pl-5 mb-6">
                            <li>provide the Service;</li>
                            <li>maintain business records;</li>
                            <li>comply with legal obligations; and</li>
                            <li>resolve disputes and enforce agreements.</li>
                        </ul>

                        <h2 className="text-lg font-bold mb-2">7. Security</h2>
                        <p className="mb-6">We implement reasonable administrative, technical, and organizational safeguards designed to protect information from unauthorized access, disclosure, alteration, and destruction. However, no security measure is perfect, and we cannot guarantee absolute security.</p>

                        <h2 className="text-lg font-bold mb-2">8. International Data Transfers</h2>
                        <p className="mb-6">Ledger is operated from the United States. If you access the Service from outside the United States, your information may be transferred to, stored in, and processed in the United States or other jurisdictions where we or our service providers operate. These jurisdictions may have data protection laws different from those in your location.</p>

                        <h2 className="text-lg font-bold mb-2">9. Your Privacy Rights and Choices</h2>
                        <p className="mb-2">Depending on your location, you may have certain rights regarding your personal information, which may include the right to:</p>
                        <ul className="list-disc pl-5 mb-4">
                            <li>request access to personal information we hold about you;</li>
                            <li>request correction of inaccurate information;</li>
                            <li>request deletion of your personal information;</li>
                            <li>object to or restrict certain processing; and</li>
                            <li>receive a copy of certain information in a portable format.</li>
                        </ul>
                        <p className="mb-4">To exercise these rights, contact us at <a href="mailto:ledger@metromeshmedia.com" className="text-ledger-accent underline">ledger@metromeshmedia.com</a>. We may request information to verify your identity and process your request in accordance with applicable law.</p>

                        <h3 className="font-bold mb-1">9.1 California Privacy Notice (CCPA/CPRA — where applicable)</h3>
                        <p className="mb-6">If you are a California resident, you may have additional rights under applicable California privacy laws, including rights to access, delete, and correct, and to opt out of certain disclosures considered “sharing” under California law (as applicable). Ledger does not sell personal information.</p>

                        <h2 className="text-lg font-bold mb-2">10. Children’s Privacy</h2>
                        <p className="mb-6">The Service is not intended for children under the age of 13 (or a higher age where required by local law). We do not knowingly collect personal information from children. If you believe a child has provided personal information through the Service, contact us and we will take appropriate steps.</p>

                        <h2 className="text-lg font-bold mb-2">11. Third-Party Services</h2>
                        <p className="mb-6">The Service may integrate with third-party services (such as analytics, authentication, hosting, and email providers). Those third parties may collect and process information under their own policies. We encourage you to review the privacy policies of those third-party services.</p>

                        <h2 className="text-lg font-bold mb-2">12. Changes to This Privacy Policy</h2>
                        <p className="mb-6">We may update this Privacy Policy from time to time. When we do, we will revise the “Effective Date” above and may provide additional notice as required by law. Your continued use of the Service after any update constitutes acceptance of the updated Privacy Policy to the extent permitted by law.</p>

                        <h2 className="text-lg font-bold mb-2">13. Contact Us</h2>
                        <p className="mb-2">If you have questions or concerns about this Privacy Policy or our privacy practices, contact:</p>
                        <p className="mb-2">
                            <strong>Ledger Team</strong><br/>
                            Manhattan, New York, United States<br/>
                            <a href="mailto:ledger@metromeshmedia.com" className="text-ledger-accent underline">ledger@metromeshmedia.com</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-6 max-w-sm w-full border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-3 text-red-600 mb-4">
                      <AlertTriangle size={24} />
                      <h3 className="text-lg font-bold">Delete Account?</h3>
                  </div>
                  <p className="text-ledger-text dark:text-ledger-textDark mb-6">
                      This action is permanent and cannot be undone. All your habits and history will be wiped from our servers immediately.
                  </p>
                  <div className="flex gap-3">
                      <button 
                        onClick={() => setShowDeleteModal(false)}
                        className="flex-1 py-3 font-medium text-ledger-text dark:text-ledger-textDark hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={() => {
                            deleteAccount();
                            setShowDeleteModal(false);
                        }}
                        className="flex-1 py-3 font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                          Delete
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
