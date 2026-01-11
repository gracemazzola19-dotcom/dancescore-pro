import React, { useState } from 'react';
// No direct API usage needed - data passed as props

interface ClubMember {
  id: string;
  name: string;
  auditionNumber: string;
  email: string;
  phone: string;
  shirtSize: string;
  group: string;
  auditionId: string;
  auditionName: string;
  auditionDate: string;
  averageScore: number;
  level: string;
  assignedLevel: string;
  previousMember: string;
  previousLevel: string;
  scores: { [judgeName: string]: any };
}

interface ClubMembersProps {
  clubMembers: ClubMember[];
  onDeleteMember: (memberId: string, memberName: string) => void;
  getLevelColor: (level: string) => string;
}

const ClubMembers: React.FC<ClubMembersProps> = ({ clubMembers, onDeleteMember, getLevelColor }) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpanded = (memberId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId);
    } else {
      newExpanded.add(memberId);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="admin-section">
      <h3>Club Members Database</h3>
      <p style={{ color: '#666', marginBottom: '1rem', fontSize: '1rem' }}>
        All dancers who have completed auditions, sorted by highest score
      </p>
      
      {clubMembers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>No club members yet</p>
          <p>When you complete an audition and lock scores, dancers will appear here</p>
        </div>
      ) : (
        <table className="results-table">
          <thead>
            <tr>
              <th>Average Score</th>
              <th>Name</th>
              <th>#</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Shirt Size</th>
              <th>Assigned Level</th>
              <th>Audition</th>
              <th>Date</th>
              <th>Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clubMembers.map((member, index) => (
              <React.Fragment key={member.id}>
                <tr style={{
                  backgroundColor: getLevelColor(member.level || member.assignedLevel || 'Level 4'),
                  color: '#333333'
                }}>
                  <td style={{ fontWeight: '700', fontSize: '1.2rem', color: '#28a745' }}>
                    {member.averageScore?.toFixed(2) || '-'}
                  </td>
                  <td style={{ fontWeight: '600' }}>{member.name}</td>
                  <td>{member.auditionNumber}</td>
                  <td style={{ fontSize: '0.85rem' }}>{member.email || '-'}</td>
                  <td style={{ fontSize: '0.85rem' }}>{member.phone || '-'}</td>
                  <td>{member.shirtSize || '-'}</td>
                  <td style={{ 
                    fontWeight: '700', 
                    fontSize: '1rem',
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    textAlign: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    color: '#333333',
                    border: '2px solid rgba(255, 255, 255, 0.5)'
                  }}>
                    {member.level || member.assignedLevel || 'Level 4'}
                  </td>
                  <td>{member.auditionName || 'Unknown'}</td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {member.auditionDate ? new Date(member.auditionDate).toLocaleDateString() : '-'}
                  </td>
                  <td>
                    <button
                      onClick={() => toggleExpanded(member.id)}
                      className="add-dancer-button"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    >
                      {expandedRows.has(member.id) ? 'Hide' : 'Show'}
                    </button>
                  </td>
                  <td>
                    <button
                      onClick={() => onDeleteMember(member.id, member.name)}
                      className="add-dancer-button"
                      style={{
                        padding: '0.5rem 1rem', 
                        fontSize: '0.85rem',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                
                {/* Expanded Details */}
                {expandedRows.has(member.id) && (
                  <tr>
                    <td colSpan={11} style={{ padding: '0', backgroundColor: '#f8f9fa' }}>
                      <div style={{ padding: '2rem', borderTop: '1px solid #dee2e6' }}>
                        {/* Compact Header */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          marginBottom: '1rem',
                          padding: '0.75rem',
                          backgroundColor: 'white',
                          borderRadius: '0.5rem',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#333' }}>
                              {member.name} - #{member.auditionNumber}
                            </h3>
                            <p style={{ margin: '0.25rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>
                              {member.email} • {member.phone} • {member.shirtSize}
                            </p>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#6c757d', marginBottom: '0.25rem' }}>Overall Score</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#17a2b8' }}>{member.averageScore?.toFixed(2) || 'N/A'}</div>
                            <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>out of 32 points</div>
                          </div>
                        </div>

                        {/* Compact Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                          {(() => {
                            if (!member.scores || Object.keys(member.scores).length === 0) {
                              return <div style={{ color: '#6c757d', textAlign: 'center', padding: '1rem' }}>No statistical data available</div>;
                            }
                            
                            const scores = Object.values(member.scores)
                              .filter(s => s && typeof s === 'object' && typeof s.total === 'number')
                              .map(s => s.total);
                              
                            if (scores.length === 0) {
                              return <div style={{ color: '#6c757d', textAlign: 'center', padding: '1rem' }}>No valid scores found</div>;
                            }
                            
                            const sortedScores = [...scores].sort((a, b) => a - b);
                            const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
                            const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
                            const stdDev = Math.sqrt(variance);
                            const min = Math.min(...scores);
                            const max = Math.max(...scores);
                            
                            // Calculate overall percentile compared to all club members
                            const allMemberScores = clubMembers.map(m => m.averageScore).sort((a, b) => a - b);
                            const percentile = allMemberScores.length > 1
                              ? Math.round((allMemberScores.filter(s => s < member.averageScore).length / allMemberScores.length) * 100)
                              : 0;
                            
                            const rank = [...clubMembers].sort((a, b) => b.averageScore - a.averageScore).findIndex(m => m.id === member.id) + 1;
                            
                            const stdDevNum = parseFloat(stdDev.toFixed(2));
                            let confidence = 'High';
                            let confidenceColor = '#28a745';
                            if (stdDevNum > 2.5) {
                              confidence = 'Low';
                              confidenceColor = '#dc3545';
                            } else if (stdDevNum > 1.5) {
                              confidence = 'Moderate';
                              confidenceColor = '#ffc107';
                            }
                            
                            const getPercentileLabel = (pct: number) => {
                              if (pct >= 90) return { label: 'Excellent', color: '#28a745', bgColor: '#d4edda' };
                              if (pct >= 75) return { label: 'Very Good', color: '#5cb85c', bgColor: '#d4edda' };
                              if (pct >= 60) return { label: 'Good', color: '#17a2b8', bgColor: '#d1ecf1' };
                              if (pct >= 40) return { label: 'Average', color: '#856404', bgColor: '#fff3cd' };
                              return { label: 'Needs Work', color: '#721c24', bgColor: '#f8d7da' };
                            };
                            
                            return (
                              <>
                                <div style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #17a2b8', textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.7rem', color: '#6c757d', marginBottom: '0.25rem' }}>RANKING</div>
                                  <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#17a2b8' }}>#{rank}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>of {clubMembers.length}</div>
                                </div>
                                
                                <div style={{ 
                                  backgroundColor: getPercentileLabel(percentile).bgColor, 
                                  padding: '0.75rem', 
                                  borderRadius: '0.5rem', 
                                  border: `1px solid ${getPercentileLabel(percentile).color}`,
                                  textAlign: 'center'
                                }}>
                                  <div style={{ fontSize: '0.7rem', color: '#6c757d', marginBottom: '0.25rem' }}>PERCENTILE</div>
                                  <div style={{ fontSize: '1.2rem', fontWeight: '700', color: getPercentileLabel(percentile).color }}>{percentile}th</div>
                                  <div style={{ fontSize: '0.7rem', color: getPercentileLabel(percentile).color, fontWeight: '600' }}>
                                    {getPercentileLabel(percentile).label}
                                  </div>
                                </div>
                                
                                <div style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #17a2b8', textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.7rem', color: '#6c757d', marginBottom: '0.25rem' }}>AGREEMENT</div>
                                  <div style={{ fontSize: '1.2rem', fontWeight: '700', color: confidenceColor }}>{confidence}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>SD: {stdDev.toFixed(2)}</div>
                                </div>
                                
                                <div style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #17a2b8', textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.7rem', color: '#6c757d', marginBottom: '0.25rem' }}>RANGE</div>
                                  <div style={{ fontSize: '1rem', fontWeight: '700', color: '#495057' }}>
                                    {min.toFixed(1)} - {max.toFixed(1)}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>{(max - min).toFixed(1)} pts</div>
                                </div>
                                
                                <div style={{ backgroundColor: '#f8f9fa', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #dee2e6' }}>
                                  <div style={{ fontSize: '0.7rem', color: '#495057', marginBottom: '0.5rem', fontWeight: '600' }}>STATISTICS</div>
                                  <div style={{ fontSize: '0.7rem', color: '#6c757d', lineHeight: '1.3' }}>
                                    <div>Mean: {mean.toFixed(2)}</div>
                                    <div>Median: {sortedScores[Math.floor(sortedScores.length * 0.5)]?.toFixed(2) || '0.00'}</div>
                                    <div>25th: {sortedScores[Math.floor(sortedScores.length * 0.25)]?.toFixed(2) || '0.00'}</div>
                                    <div>75th: {sortedScores[Math.floor(sortedScores.length * 0.75)]?.toFixed(2) || '0.00'}</div>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        {/* Compact Judge Scores */}
                        <div style={{ marginBottom: '1rem' }}>
                          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '600', color: '#333' }}>Judge Scores</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                            {Object.keys(member.scores || {}).length === 0 ? (
                              <p style={{ color: '#666', fontStyle: 'italic', fontSize: '0.9rem' }}>No scores submitted yet</p>
                            ) : (
                              Object.entries(member.scores || {}).map(([judgeName, score]) => {
                                const scores = Object.values(member.scores || {})
                                  .filter(s => s && typeof s === 'object' && typeof s.total === 'number')
                                  .map(s => s.total);
                                const min = Math.min(...scores);
                                const max = Math.max(...scores);
                                const isLowest = score.total === min;
                                const isHighest = score.total === max;
                                
                                return (
                                  <div key={judgeName} style={{ 
                                    backgroundColor: isLowest ? '#ffe6e6' : isHighest ? '#e6ffe6' : 'white', 
                                    padding: '0.5rem', 
                                    borderRadius: '0.5rem',
                                    border: isLowest ? '2px solid #dc3545' : isHighest ? '2px solid #28a745' : '1px solid #dee2e6',
                                    fontSize: '0.8rem'
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                      <div style={{ fontWeight: '600', color: '#667eea' }}>{judgeName}</div>
                                      <div style={{ fontWeight: '700', color: isLowest ? '#dc3545' : isHighest ? '#28a745' : '#667eea' }}>
                                        {(score.total || 0).toFixed(1)}
                                      </div>
                                    </div>
                                    {(isLowest || isHighest) && (
                                      <div style={{ 
                                        fontSize: '0.65rem', 
                                        fontWeight: '600',
                                        color: isLowest ? '#dc3545' : '#28a745',
                                        marginBottom: '0.25rem'
                                      }}>
                                        {isLowest ? 'LOWEST' : 'HIGHEST'}
                                      </div>
                                    )}
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.25rem', fontSize: '0.7rem' }}>
                                      <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: '#6c757d' }}>Kick</div>
                                        <div style={{ fontWeight: '600' }}>{score.kick}/4</div>
                                      </div>
                                      <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: '#6c757d' }}>Jump</div>
                                        <div style={{ fontWeight: '600' }}>{score.jump}/4</div>
                                      </div>
                                      <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: '#6c757d' }}>Turn</div>
                                        <div style={{ fontWeight: '600' }}>{score.turn}/4</div>
                                      </div>
                                      <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: '#6c757d' }}>Perf</div>
                                        <div style={{ fontWeight: '600' }}>{score.performance}/4</div>
                                      </div>
                                      <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: '#6c757d' }}>Exec</div>
                                        <div style={{ fontWeight: '600' }}>{score.execution}/8</div>
                                      </div>
                                      <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: '#6c757d' }}>Tech</div>
                                        <div style={{ fontWeight: '600' }}>{score.technique}/8</div>
                                      </div>
                                    </div>
                                    
                                    {score.comments && (
                                      <div style={{ 
                                        marginTop: '0.25rem', 
                                        padding: '0.25rem', 
                                        backgroundColor: '#f8f9fa', 
                                        borderRadius: '0.25rem',
                                        fontSize: '0.7rem',
                                        color: '#6c757d',
                                        fontStyle: 'italic'
                                      }}>
                                        "{score.comments}"
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* Areas of Improvement */}
                        <div style={{ 
                          backgroundColor: '#fff3cd', 
                          border: '1px solid #ffeaa7', 
                          borderRadius: '0.5rem', 
                          padding: '1rem', 
                          marginBottom: '1rem' 
                        }}>
                          <h4 style={{ margin: '0 0 0.75rem 0', color: '#856404', fontWeight: '600' }}>Areas of Improvement</h4>
                          {(() => {
                            if (!member.scores || Object.keys(member.scores).length === 0) {
                              return <p style={{ color: '#856404', fontStyle: 'italic', fontSize: '0.9rem' }}>No score data available for analysis</p>;
                            }

                            const scores = Object.values(member.scores);
                            if (scores.length === 0) return [];

                            // Calculate average scores for each category
                            const categoryAverages = {
                              kick: scores.reduce((sum, s) => sum + (s.kick || 0), 0) / scores.length,
                              jump: scores.reduce((sum, s) => sum + (s.jump || 0), 0) / scores.length,
                              turn: scores.reduce((sum, s) => sum + (s.turn || 0), 0) / scores.length,
                              performance: scores.reduce((sum, s) => sum + (s.performance || 0), 0) / scores.length,
                              execution: scores.reduce((sum, s) => sum + (s.execution || 0), 0) / scores.length,
                              technique: scores.reduce((sum, s) => sum + (s.technique || 0), 0) / scores.length,
                            };

                            const improvements = [];
                            
                            // Check each category against maximum possible scores
                            if (categoryAverages.kick < 3.0) improvements.push({ category: 'Kick', score: categoryAverages.kick, max: 4, priority: 'high' });
                            if (categoryAverages.jump < 3.0) improvements.push({ category: 'Jump', score: categoryAverages.jump, max: 4, priority: 'high' });
                            if (categoryAverages.turn < 3.0) improvements.push({ category: 'Turn', score: categoryAverages.turn, max: 4, priority: 'high' });
                            if (categoryAverages.performance < 3.0) improvements.push({ category: 'Performance', score: categoryAverages.performance, max: 4, priority: 'high' });
                            if (categoryAverages.execution < 5.0) improvements.push({ category: 'Execution', score: categoryAverages.execution, max: 8, priority: 'medium' });
                            if (categoryAverages.technique < 5.0) improvements.push({ category: 'Technique', score: categoryAverages.technique, max: 8, priority: 'medium' });

                            // Sort by priority and score
                            const sortedImprovements = improvements.sort((a, b) => {
                              if (a.priority !== b.priority) {
                                return a.priority === 'high' ? -1 : 1;
                              }
                              return a.score - b.score;
                            });

                            if (sortedImprovements.length === 0) {
                              return <p style={{ color: '#856404', fontStyle: 'italic', fontSize: '0.9rem' }}>All categories are performing well!</p>;
                            }

                            return (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                {sortedImprovements.map((improvement, index) => (
                                  <div key={index} style={{ 
                                    backgroundColor: 'white', 
                                    padding: '0.75rem', 
                                    borderRadius: '0.5rem',
                                    border: `2px solid ${improvement.priority === 'high' ? '#dc3545' : '#ffc107'}`
                                  }}>
                                    <div style={{ 
                                      fontSize: '0.8rem', 
                                      fontWeight: '600', 
                                      color: improvement.priority === 'high' ? '#dc3545' : '#856404',
                                      marginBottom: '0.5rem'
                                    }}>
                                      {improvement.category} ({improvement.priority === 'high' ? 'High Priority' : 'Medium Priority'})
                                    </div>
                                    <div style={{ marginBottom: '0.5rem' }}>
                                      <div style={{ fontSize: '0.7rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                                        Current: {improvement.score.toFixed(1)}/{improvement.max}
                                      </div>
                                      <div style={{ 
                                        width: '100%', 
                                        height: '8px', 
                                        backgroundColor: '#e9ecef', 
                                        borderRadius: '4px', 
                                        overflow: 'hidden' 
                                      }}>
                                        <div style={{ 
                                          width: `${(improvement.score / improvement.max) * 100}%`, 
                                          height: '100%', 
                                          backgroundColor: improvement.priority === 'high' ? '#dc3545' : '#ffc107',
                                          transition: 'width 0.3s ease'
                                        }} />
                                      </div>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>
                                      Target: {improvement.max * 0.75}+ for improvement
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ClubMembers;