import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

interface Dancer {
  id: string;
  name: string;
  auditionNumber: string;
  email: string;
  phone: string;
  shirtSize: string;
  previousMember?: string;
  previousLevel?: string;
  group: string;
  averageScore: number;
  rank: number;
  scores: {
    [judgeName: string]: {
      kick: number;
      jump: number;
      turn: number;
      performance: number;
      execution: number;
      technique: number;
      total: number;
      comments: string;
      submittedAt?: any;
    };
  };
}

interface Audition {
  id: string;
  name: string;
  date: string;
  status: 'draft' | 'active' | 'completed' | 'deliberations' | 'archived';
  judges: string[];
  dancers: number;
}

const Deliberations: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [audition, setAudition] = useState<Audition | null>(null);
  const [dancers, setDancers] = useState<Dancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Level assignments
  const [levelAssignments, setLevelAssignments] = useState<{ [dancerId: string]: string }>({});
  const [levelCounts, setLevelCounts] = useState<{ [level: string]: number }>({});
  
  // Expanded rows for detailed view
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Manual ordering state
  const [manualOrder, setManualOrder] = useState<string[]>([]);
  
  // Level confirmation state
  const [confirmedDancers, setConfirmedDancers] = useState<Set<string>>(new Set());

  const fetchAuditionDetails = async () => {
    try {
      const response = await api.get(`/api/deliberations/${id}`);
      const data = response.data;
      
      if (data.levelAssignments && Object.keys(data.levelAssignments).length > 0) {
        setLevelAssignments(data.levelAssignments);
        setLevelCounts(data.levelCounts || {});
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching audition details:', error);
      toast.error('Failed to fetch audition details');
      return null;
    }
  };

  const fetchDancers = async () => {
    try {
      const response = await api.get(`/api/dancers-with-scores?auditionId=${id}`);
      const dancersData = response.data;
      
      // Sort by average score (highest first) initially
      dancersData.sort((a: Dancer, b: Dancer) => (b.averageScore || 0) - (a.averageScore || 0));
      
      setDancers(dancersData);
      
      // Initialize manual order with current score-based order
      if (manualOrder.length === 0) {
        setManualOrder(dancersData.map((d: Dancer) => d.id));
      }
      
      return dancersData;
    } catch (error) {
      console.error('Error fetching dancers:', error);
      toast.error('Failed to fetch dancers');
      return [];
    }
  };

  useEffect(() => {
    if (id) {
      const loadData = async () => {
        try {
          // Fetch audition details first
          const auditionResponse = await api.get(`/api/auditions/${id}`);
          setAudition(auditionResponse.data);
          
        const savedProgress = await fetchAuditionDetails();
        const dancersData = await fetchDancers();
        
        // Only initialize level assignments if no saved progress exists
        if (!savedProgress && dancersData.length > 0) {
            console.log('Starting deliberations - initializing level assignments');
          initializeLevelAssignments(dancersData);
          }
        } catch (error) {
          console.error('Error loading deliberations data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const initializeLevelAssignments = (dancersData: Dancer[]) => {
    const initialAssignments: { [dancerId: string]: string } = {};
    const initialCounts: { [level: string]: number } = {};
    
    // Auto-sort dancers into 4 levels based on score distribution
    const sortedDancers = [...dancersData].sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));
    const dancersPerLevel = Math.ceil(sortedDancers.length / 4);
    
    sortedDancers.forEach((dancer, index) => {
      let level = 'Level 1';
      if (index >= dancersPerLevel * 3) {
        level = 'Level 4';
      } else if (index >= dancersPerLevel * 2) {
        level = 'Level 3';
      } else if (index >= dancersPerLevel) {
        level = 'Level 2';
      }
      
      initialAssignments[dancer.id] = level;
      initialCounts[level] = (initialCounts[level] || 0) + 1;
    });
    
    setLevelAssignments(initialAssignments);
    setLevelCounts(initialCounts);
  };

  const handleLevelChange = (dancerId: string, newLevel: string) => {
    const oldLevel = levelAssignments[dancerId];
    
    setLevelAssignments(prev => ({
      ...prev,
      [dancerId]: newLevel
    }));
    
    setLevelCounts(prev => {
      const newCounts = { ...prev };
      
      // Decrease old level count
      if (newCounts[oldLevel] > 0) {
        newCounts[oldLevel]--;
      }
      
      // Increase new level count
      newCounts[newLevel] = (newCounts[newLevel] || 0) + 1;
      
      return newCounts;
    });
  };

  const handleSubmitDeliberations = async () => {
    if (Object.keys(levelAssignments).length !== dancers.length) {
      toast.error('Please assign all dancers to levels before submitting');
      return;
    }
    
    if (confirmedDancers.size !== dancers.length) {
      toast.error('Please confirm all dancer level assignments before submitting');
      return;
    }
    
    setSubmitting(true);
    
    try {
      await api.post(`/api/deliberations/${id}`, {
        levelAssignments,
        levelCounts
      });
      
      toast.success('Deliberations saved successfully!');
      
      // Navigate back to admin dashboard
      navigate('/admin');
    } catch (error) {
      console.error('Error submitting deliberations:', error);
      toast.error('Failed to submit deliberations');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRowExpansion = (dancerId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dancerId)) {
        newSet.delete(dancerId);
      } else {
        newSet.add(dancerId);
      }
      return newSet;
    });
  };

  const handleDragStart = (e: React.DragEvent, dancerId: string) => {
    e.dataTransfer.setData('text/plain', dancerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetLevel: string) => {
    e.preventDefault();
    const dancerId = e.dataTransfer.getData('text/plain');
    if (dancerId && targetLevel !== levelAssignments[dancerId]) {
      handleLevelChange(dancerId, targetLevel);
      toast.success(`Moved ${dancers.find(d => d.id === dancerId)?.name} to ${targetLevel}`);
    }
  };

  const handleManualReorder = (draggedDancerId: string, targetDancerId: string) => {
    const draggedIndex = manualOrder.indexOf(draggedDancerId);
    const targetIndex = manualOrder.indexOf(targetDancerId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newOrder = [...manualOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedDancerId);
    
    setManualOrder(newOrder);
    
    const draggedDancer = dancers.find(d => d.id === draggedDancerId);
    const targetDancer = dancers.find(d => d.id === targetDancerId);
    
    if (draggedDancer && targetDancer) {
      toast.success(`Moved ${draggedDancer.name} to position above ${targetDancer.name}`);
    }
  };

  const getOrderedDancers = () => {
    if (manualOrder.length === 0) return dancers;
    
    return manualOrder.map(id => dancers.find(d => d.id === id)).filter(Boolean) as Dancer[];
  };

  const handleLevelButtonClick = (dancerId: string, newLevel: string) => {
    const dancer = dancers.find(d => d.id === dancerId);
    if (dancer && newLevel !== levelAssignments[dancerId]) {
      handleLevelChange(dancerId, newLevel);
      toast.success(`Moved ${dancer.name} to ${newLevel}`);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Level 1': return { bg: '#ffe6f0', border: '#ff69b4' }; // Light pink
      case 'Level 2': return { bg: '#f0e6ff', border: '#9370db' }; // Light purple
      case 'Level 3': return { bg: '#fffacd', border: '#ffd700' }; // Light yellow
      case 'Level 4': return { bg: '#e6ffe6', border: '#32cd32' }; // Light green
      default: return { bg: '#f8f9fa', border: '#6c757d' }; // Default gray
    }
  };

  const getLevelChangeFlag = (dancer: Dancer, currentLevel: string) => {
    // Check if dancer was a previous member and if their level has changed
    if (dancer.previousMember && dancer.previousMember.toLowerCase() === 'yes' && dancer.previousLevel) {
      const previousLevelNum = parseInt(dancer.previousLevel.replace('Level ', ''));
      const currentLevelNum = parseInt(currentLevel.replace('Level ', ''));
      
      if (currentLevelNum < previousLevelNum) {
        return { flag: 'UP', color: '#28a745', text: 'Moved Up' }; // Green for improvement
      } else if (currentLevelNum > previousLevelNum) {
        return { flag: 'DOWN', color: '#dc3545', text: 'Moved Down' }; // Red for decrease
      }
    }
    return null;
  };

  const toggleDancerConfirmation = (dancerId: string) => {
    setConfirmedDancers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dancerId)) {
        newSet.delete(dancerId);
    } else {
        newSet.add(dancerId);
      }
      return newSet;
    });
  };

  const getAreasOfImprovement = (dancer: Dancer) => {
    if (!dancer.scores || Object.keys(dancer.scores).length === 0) {
      return [];
    }

    const scores = Object.values(dancer.scores);
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
    return improvements.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority === 'high' ? -1 : 1;
      }
      return a.score - b.score;
    });
  };

  const getJudgeScoringTrends = () => {
    if (!dancers || dancers.length === 0) return null;

    const allScores = dancers.flatMap(dancer => 
      Object.entries(dancer.scores || {}).map(([judgeName, score]) => ({
        judge: judgeName,
        total: score.total,
        dancer: dancer.name
      }))
    );

    if (allScores.length === 0) return null;

    // Group scores by judge
    const judgeStats: { [judge: string]: { scores: number[], average: number, count: number, stdDev: number } } = {};
    
    allScores.forEach(score => {
      if (score.judge) {
        if (!judgeStats[score.judge]) {
          judgeStats[score.judge] = { scores: [], average: 0, count: 0, stdDev: 0 };
        }
        judgeStats[score.judge].scores.push(score.total);
      }
    });

    // Calculate statistics for each judge
    Object.keys(judgeStats).forEach(judge => {
      const stats = judgeStats[judge];
      stats.count = stats.scores.length;
      stats.average = stats.scores.reduce((sum, score) => sum + score, 0) / stats.count;
      
      const variance = stats.scores.reduce((sum, score) => sum + Math.pow(score - stats.average, 2), 0) / stats.count;
      stats.stdDev = Math.sqrt(variance);
    });

    // Find trends
    const trends = {
      highestAverage: Object.keys(judgeStats).reduce((a, b) => judgeStats[a].average > judgeStats[b].average ? a : b),
      lowestAverage: Object.keys(judgeStats).reduce((a, b) => judgeStats[a].average < judgeStats[b].average ? a : b),
      mostConsistent: Object.keys(judgeStats).reduce((a, b) => judgeStats[a].stdDev < judgeStats[b].stdDev ? a : b),
      leastConsistent: Object.keys(judgeStats).reduce((a, b) => judgeStats[a].stdDev > judgeStats[b].stdDev ? a : b),
      judgeStats
    };

    return trends;
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '1.2rem', color: '#666' }}>Loading deliberations...</div>
        </div>
      </div>
    );
  }

  if (!audition) {
  return (
      <div className="admin-container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '1.2rem', color: '#dc3545' }}>Audition not found</div>
          <button 
            className="add-dancer-button" 
            onClick={() => navigate('/admin')}
            style={{ marginTop: '1rem' }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-content">
        {/* Header */}
        <div className="admin-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#333' }}>
                Deliberations: {audition.name}
              </h1>
              <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '1.1rem' }}>
                Assign dancers to levels based on their performance
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button 
                className="add-dancer-button" 
                onClick={() => navigate('/admin')}
                style={{ padding: '0.75rem 1.5rem' }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Judge Scoring Trends */}
        <div className="admin-section">
          <h2 style={{ marginBottom: '1rem', color: '#333' }}>Judge Scoring Trends</h2>
          {(() => {
            const trends = getJudgeScoringTrends();
            if (!trends) {
              return (
          <div style={{
                  backgroundColor: '#f8f9fa', 
                  border: '1px solid #dee2e6', 
                  borderRadius: '0.5rem', 
            padding: '1rem',
                  textAlign: 'center',
                  color: '#6c757d'
                }}>
                  No scoring trends available yet
                </div>
              );
            }

            return (
              <div style={{ 
                backgroundColor: 'white', 
                border: '1px solid #dee2e6', 
            borderRadius: '0.5rem',
                padding: '1.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ 
                    backgroundColor: '#d4edda', 
                    border: '1px solid #c3e6cb', 
                    borderRadius: '0.5rem', 
                    padding: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: '#155724', marginBottom: '0.25rem' }}>HIGHEST AVERAGE</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#155724' }}>{trends.highestAverage}</div>
                    <div style={{ fontSize: '0.9rem', color: '#155724' }}>
                      {trends.judgeStats[trends.highestAverage].average.toFixed(2)} avg
          </div>
        </div>

                  <div style={{ 
                    backgroundColor: '#f8d7da', 
                    border: '1px solid #f5c6cb', 
                    borderRadius: '0.5rem', 
                    padding: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: '#721c24', marginBottom: '0.25rem' }}>LOWEST AVERAGE</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#721c24' }}>{trends.lowestAverage}</div>
                    <div style={{ fontSize: '0.9rem', color: '#721c24' }}>
                      {trends.judgeStats[trends.lowestAverage].average.toFixed(2)} avg
                    </div>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: '#d1ecf1', 
                    border: '1px solid #bee5eb', 
                    borderRadius: '0.5rem', 
                    padding: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: '#0c5460', marginBottom: '0.25rem' }}>MOST CONSISTENT</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0c5460' }}>{trends.mostConsistent}</div>
                    <div style={{ fontSize: '0.9rem', color: '#0c5460' }}>
                      SD: {trends.judgeStats[trends.mostConsistent].stdDev.toFixed(2)}
                    </div>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: '#fff3cd', 
                    border: '1px solid #ffeaa7', 
                    borderRadius: '0.5rem', 
                    padding: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: '#856404', marginBottom: '0.25rem' }}>LEAST CONSISTENT</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#856404' }}>{trends.leastConsistent}</div>
                    <div style={{ fontSize: '0.9rem', color: '#856404' }}>
                      SD: {trends.judgeStats[trends.leastConsistent].stdDev.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div style={{ 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '0.5rem', 
                  padding: '1rem',
                  fontSize: '0.9rem'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#495057' }}>All Judge Statistics:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                    {Object.entries(trends.judgeStats).map(([judge, stats]) => (
                      <div key={judge} style={{ 
                        backgroundColor: 'white', 
                        padding: '0.75rem', 
                        borderRadius: '0.25rem',
                        border: '1px solid #dee2e6'
                      }}>
                        <div style={{ fontWeight: '600', fontSize: '0.8rem', color: '#495057' }}>{judge}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                          Avg: {stats.average.toFixed(2)} | SD: {stats.stdDev.toFixed(2)} | Count: {stats.count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Instructions */}
        <div className="admin-section">
          <div style={{ 
            backgroundColor: '#e3f2fd', 
            border: '1px solid #2196f3', 
            borderRadius: '0.5rem', 
            padding: '1rem', 
            marginBottom: '2rem',
            fontSize: '0.9rem',
            color: '#1976d2'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>How to Use Drag & Drop:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              <div>
                <strong>Method 1 - Reorder Dancers:</strong><br/>
                Drag dancer rows onto other dancer rows to change their ranking order
              </div>
              <div>
                <strong>Method 2 - Drop on Level Boxes:</strong><br/>
                Drag any dancer row to the colored level boxes at the top
              </div>
              <div>
                <strong>Method 3 - Level Control Buttons:</strong><br/>
                Click L1, L2, L3, L4 buttons in each row for instant level changes
              </div>
            </div>
          </div>
        </div>

        {/* Level Assignment Summary with Drag Drop Zones */}
        <div className="admin-section">
          <h2 style={{ marginBottom: '1rem', color: '#333' }}>Level Assignment Summary</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {['Level 1', 'Level 2', 'Level 3', 'Level 4'].map((level) => {
              const count = levelCounts[level] || 0;
              const colors = getLevelColor(level);
              return (
                <div 
                  key={level} 
                  style={{
                    backgroundColor: colors.bg,
                    border: `2px solid ${colors.border}`,
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    textAlign: 'center',
                    minHeight: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, level)}
                  onDragEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: colors.border }}>
                    {count}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: colors.border, fontWeight: '600' }}>
                    {level}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.5rem' }}>
                    Drop dancers here
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Level Score Variance Analysis */}
        <div className="admin-section">
          <h2 style={{ marginBottom: '1rem', color: '#333' }}>Score Variance by Level</h2>
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            border: '1px solid #dee2e6', 
            borderRadius: '0.5rem', 
            padding: '1rem', 
            marginBottom: '1.5rem' 
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {['Level 1', 'Level 2', 'Level 3', 'Level 4'].map((level) => {
                const count = levelCounts[level] || 0;
                if (count === 0) return null;
                
                // Get dancers in this level
                const levelDancers = dancers.filter(dancer => levelAssignments[dancer.id] === level);
                const scores = levelDancers.map(d => d.averageScore).filter(score => typeof score === 'number');
                
                if (scores.length === 0) return null;
                
                const sortedScores = [...scores].sort((a, b) => a - b);
                const min = Math.min(...scores);
                const max = Math.max(...scores);
                const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
                const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
                const stdDev = Math.sqrt(variance);
                const range = max - min;
                
                // Calculate quartiles
                const p25Index = Math.floor(sortedScores.length * 0.25);
                const p50Index = Math.floor(sortedScores.length * 0.5);
                const p75Index = Math.floor(sortedScores.length * 0.75);
                
                const p25 = sortedScores[p25Index] || 0;
                const p50 = sortedScores[p50Index] || 0;
                const p75 = sortedScores[p75Index] || 0;
                
                // Determine consistency level
                let consistency = 'High';
                let consistencyColor = '#28a745';
                if (stdDev > 2.0) {
                  consistency = 'Low';
                  consistencyColor = '#dc3545';
                } else if (stdDev > 1.0) {
                  consistency = 'Moderate';
                  consistencyColor = '#ffc107';
                }
                
                const colors = getLevelColor(level);
                
                return (
              <div key={level} style={{
                    backgroundColor: 'white', 
                padding: '1rem',
                borderRadius: '0.5rem',
                    border: `2px solid ${colors.border}`,
                    fontSize: '0.85rem'
              }}>
                <div style={{ 
                      fontSize: '1.1rem', 
                  fontWeight: '700', 
                      color: colors.border, 
                      marginBottom: '0.75rem',
                      textAlign: 'center'
                }}>
                      {level} ({count} dancers)
                </div>
                    
                    {/* Score Range */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontWeight: '600', color: '#495057', marginBottom: '0.25rem' }}>Score Range</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: '#333' }}>
                        {min.toFixed(1)} - {max.toFixed(1)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                        Spread: {range.toFixed(1)} points
                      </div>
                    </div>
                    
                    {/* Statistics Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>Mean</div>
                        <div style={{ fontWeight: '600' }}>{mean.toFixed(1)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>Median</div>
                        <div style={{ fontWeight: '600' }}>{p50.toFixed(1)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>25th %ile</div>
                        <div style={{ fontWeight: '600' }}>{p25.toFixed(1)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>75th %ile</div>
                        <div style={{ fontWeight: '600' }}>{p75.toFixed(1)}</div>
                      </div>
                    </div>
                    
                    {/* Consistency Indicator */}
                <div style={{ 
                      backgroundColor: '#f8f9fa', 
                      padding: '0.75rem', 
                      borderRadius: '0.25rem',
                      textAlign: 'center',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>Consistency</div>
                      <div style={{ fontWeight: '600', color: consistencyColor, fontSize: '0.9rem' }}>{consistency}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>SD: {stdDev.toFixed(2)}</div>
                </div>
                    
                    {/* Visual Score Distribution */}
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>Score Distribution</div>
                <div style={{ 
                        height: '24px', 
                        backgroundColor: '#e9ecef', 
                        borderRadius: '12px', 
                        position: 'relative',
                        overflow: 'hidden',
                        marginBottom: '0.25rem'
                      }}>
                        <div style={{ 
                          position: 'absolute',
                          left: `${((min - 9) / (31 - 9)) * 100}%`,
                          width: `${((max - min) / (31 - 9)) * 100}%`,
                          height: '100%',
                          backgroundColor: colors.border,
                          opacity: 0.7,
                          borderRadius: '12px'
                        }} />
                        <div style={{ 
                          position: 'absolute',
                          left: `${((mean - 9) / (31 - 9)) * 100}%`,
                          width: '3px',
                          height: '100%',
                          backgroundColor: '#333',
                          borderRadius: '1.5px'
                        }} />
                </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '0.7rem', 
                        color: '#6c757d'
                      }}>
                        <span>9</span>
                        <span>31</span>
              </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Confirmation Summary */}
        <div className="admin-section">
          <h2 style={{ marginBottom: '1rem', color: '#333' }}>Confirmation Status</h2>
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '0.5rem', 
            padding: '1.5rem', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#333', marginBottom: '0.5rem' }}>
                Level Assignments Confirmed
            </div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>
                {confirmedDancers.size} of {dancers.length} dancers confirmed
              </div>
            </div>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: '600',
              color: confirmedDancers.size === dancers.length ? '#28a745' : confirmedDancers.size > 0 ? '#ffc107' : '#dc3545'
            }}>
              {confirmedDancers.size === dancers.length ? 'Complete' : confirmedDancers.size > 0 ? 'In Progress' : 'Not Started'}
            </div>
          </div>
          {confirmedDancers.size < dancers.length && (
            <div style={{ 
              backgroundColor: '#fff3cd', 
              border: '1px solid #ffeaa7', 
              borderRadius: '0.5rem', 
              padding: '1rem', 
              marginTop: '1rem',
              color: '#856404'
            }}>
              <strong>Note:</strong> {dancers.length - confirmedDancers.size} dancers still need confirmation before final submission.
            </div>
          )}
        </div>

        {/* Dancers Table */}
        <div className="admin-section">
          <h2 style={{ marginBottom: '1rem', color: '#333' }}>Dancer Assignments</h2>
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Overall Score</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Dancer</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Level Assignment</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#495057' }}>Level Controls</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#495057' }}>Confirm</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#495057' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                {getOrderedDancers().map((dancer, index) => {
                  const isExpanded = expandedRows.has(dancer.id);
                  const currentLevel = levelAssignments[dancer.id] || 'Unassigned';
                  const colors = getLevelColor(currentLevel);
                  const levelChangeFlag = getLevelChangeFlag(dancer, currentLevel);

                    return (
                      <React.Fragment key={dancer.id}>
                        <tr
                        style={{ 
                          backgroundColor: isExpanded ? colors.bg : colors.bg,
                          borderBottom: `2px solid ${colors.border}`,
                          cursor: 'grab',
                          transition: 'all 0.3s ease'
                        }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, dancer.id)}
                        onDragEnd={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        onDrag={(e) => {
                          e.currentTarget.style.opacity = '0.7';
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                          onDragOver={handleDragOver}
                        onDrop={(e) => {
                          e.preventDefault();
                          const draggedDancerId = e.dataTransfer.getData('text/plain');
                          if (draggedDancerId && draggedDancerId !== dancer.id) {
                            handleManualReorder(draggedDancerId, dancer.id);
                          }
                        }}
                        onDragEnter={(e) => {
                          e.currentTarget.style.borderTop = '3px solid #007bff';
                          e.currentTarget.style.borderBottom = '3px solid #007bff';
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.style.borderTop = 'none';
                          e.currentTarget.style.borderBottom = `2px solid ${colors.border}`;
                        }}
                      >
                        <td style={{ padding: '1rem', fontWeight: '600', color: colors.border }}>
                          <div style={{ fontSize: '1.2rem' }}>
                            {(dancer.averageScore || 0).toFixed(2)}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>
                            out of 32
                          </div>
                          </td>
                        <td style={{ padding: '1rem' }}>
                              <div>
                            <div style={{ fontWeight: '600', color: '#333' }}>{dancer.name}</div>
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>#{dancer.auditionNumber}</div>
                            {levelChangeFlag && (
                              <div style={{ 
                                fontSize: '0.7rem', 
                                color: levelChangeFlag.color, 
                                fontWeight: '600',
                                marginTop: '0.25rem',
                                padding: '0.2rem 0.4rem',
                                backgroundColor: `${levelChangeFlag.color}20`,
                                borderRadius: '0.25rem',
                                display: 'inline-block'
                              }}>
                                {levelChangeFlag.text} from {dancer.previousLevel}
                                </div>
                            )}
                          </div>
                          </td>
                        <td style={{ padding: '1rem' }}>
                            <div style={{
                            display: 'inline-block',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            backgroundColor: colors.border,
                            color: 'white',
                              fontWeight: '600',
                            fontSize: '0.9rem'
                            }}>
                            {currentLevel}
                            </div>
                          </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {['Level 1', 'Level 2', 'Level 3', 'Level 4'].map(level => (
                              <button
                                key={level}
                                onClick={() => handleLevelButtonClick(dancer.id, level)}
                                style={{
                                  backgroundColor: level === currentLevel ? colors.border : '#f8f9fa',
                                  color: level === currentLevel ? 'white' : '#495057',
                                  border: `1px solid ${level === currentLevel ? colors.border : '#ced4da'}`,
                                  borderRadius: '0.25rem',
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.7rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  if (level !== currentLevel) {
                                    e.currentTarget.style.backgroundColor = '#e9ecef';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (level !== currentLevel) {
                                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                                  }
                                }}
                              >
                                {level.replace('Level ', 'L')}
                              </button>
                            ))}
                            </div>
                          </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <button
                            onClick={() => toggleDancerConfirmation(dancer.id)}
                            style={{
                              backgroundColor: confirmedDancers.has(dancer.id) ? '#28a745' : '#f8f9fa',
                              color: confirmedDancers.has(dancer.id) ? 'white' : '#495057',
                              border: `2px solid ${confirmedDancers.has(dancer.id) ? '#28a745' : '#ced4da'}`,
                              borderRadius: '50%',
                              width: '2.5rem',
                              height: '2.5rem',
                              fontSize: '1.2rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                              if (!confirmedDancers.has(dancer.id)) {
                                e.currentTarget.style.backgroundColor = '#e9ecef';
                                e.currentTarget.style.borderColor = '#adb5bd';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!confirmedDancers.has(dancer.id)) {
                                e.currentTarget.style.backgroundColor = '#f8f9fa';
                                e.currentTarget.style.borderColor = '#ced4da';
                              }
                            }}
                            title={confirmedDancers.has(dancer.id) ? 'Confirmed - Click to unconfirm' : 'Click to confirm level assignment'}
                          >
                            {confirmedDancers.has(dancer.id) ? '✓' : ''}
                            </button>
                          </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <button
                            onClick={() => toggleRowExpansion(dancer.id)}
                              style={{
                              backgroundColor: isExpanded ? '#dc3545' : '#17a2b8',
                                color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              padding: '0.5rem 1rem',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            {isExpanded ? 'Hide Details' : 'Show Details'}
                            </button>
                          </td>
                        </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} style={{ padding: '0', backgroundColor: '#f8f9fa' }}>
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
                                    {dancer.name} - #{dancer.auditionNumber}
                                  </h3>
                                  <p style={{ margin: '0.25rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>
                                    {dancer.email} • {dancer.phone} • {dancer.shirtSize}
                                  </p>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.7rem', color: '#6c757d', marginBottom: '0.25rem' }}>Overall Score</div>
                                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#17a2b8' }}>{dancer.averageScore?.toFixed(2) || 'N/A'}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>out of 32 points</div>
                                </div>
                              </div>

                              {/* Compact Stats Grid */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                                    {(() => {
                                  if (!dancer.scores || typeof dancer.scores !== 'object') {
                                    return <div style={{ color: '#6c757d', textAlign: 'center', padding: '1rem' }}>No statistical data available</div>;
                                  }
                                  
                                  const scores = Object.values(dancer.scores)
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
                                  
                                  const allDancerScores = dancers.map(d => d.averageScore).sort((a, b) => a - b);
                                  const percentile = allDancerScores.length > 1
                                    ? Math.round((allDancerScores.filter(s => s < dancer.averageScore).length / allDancerScores.length) * 100)
                                    : 0;
                                  
                                  const rank = [...dancers].sort((a, b) => b.averageScore - a.averageScore).findIndex(d => d.id === dancer.id) + 1;
                                  
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
                                        <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>of {dancers.length}</div>
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
                                  {Object.keys(dancer.scores).length === 0 ? (
                                    <p style={{ color: '#666', fontStyle: 'italic', fontSize: '0.9rem' }}>No scores submitted yet</p>
                                  ) : (
                                    Object.entries(dancer.scores).map(([judgeName, score]) => {
                                      const scores = Object.values(dancer.scores)
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
                                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600', color: '#856404' }}>
                                  Areas of Improvement
                                </h4>
                                  {(() => {
                                  const improvements = getAreasOfImprovement(dancer);
                                  if (improvements.length === 0) {
                                    return (
                                      <div style={{ color: '#28a745', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                        Great job! All categories are scoring well above average.
                                      </div>
                                    );
                                  }
                                      
                                      return (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                      {improvements.map((improvement, index) => (
                                        <div key={index} style={{ 
                                          backgroundColor: improvement.priority === 'high' ? '#f8d7da' : '#d1ecf1',
                                          border: `1px solid ${improvement.priority === 'high' ? '#f5c6cb' : '#bee5eb'}`,
                                          borderRadius: '0.5rem',
                                          padding: '0.75rem'
                                        }}>
                                          <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            marginBottom: '0.5rem'
                                          }}>
                                            <div style={{ 
                                              fontWeight: '600', 
                                              fontSize: '0.9rem',
                                              color: improvement.priority === 'high' ? '#721c24' : '#0c5460'
                                            }}>
                                              {improvement.category}
                                          </div>
                                            <div style={{ 
                                              fontSize: '0.8rem',
                                              color: improvement.priority === 'high' ? '#721c24' : '#0c5460',
                                              fontWeight: '600'
                                            }}>
                                              {improvement.score.toFixed(1)}/{improvement.max}
                                          </div>
                                          </div>
                                          <div style={{ 
                                            width: '100%', 
                                            height: '6px', 
                                            backgroundColor: '#e9ecef', 
                                            borderRadius: '3px', 
                                            overflow: 'hidden'
                                          }}>
                                            <div style={{
                                              width: `${(improvement.score / improvement.max) * 100}%`, 
                                              height: '100%',
                                              backgroundColor: improvement.priority === 'high' ? '#dc3545' : '#17a2b8',
                                              transition: 'width 0.3s ease'
                                            }} />
                                          </div>
                                          <div style={{ 
                                            fontSize: '0.75rem', 
                                            color: improvement.priority === 'high' ? '#721c24' : '#0c5460',
                                            marginTop: '0.25rem',
                                            fontWeight: '600'
                                          }}>
                                            {improvement.priority === 'high' ? 'HIGH PRIORITY' : 'MEDIUM PRIORITY'}
                                            </div>
                                        </div>
                                      ))}
                                        </div>
                                      );
                                  })()}
                                </div>
                              
                              {/* High & Low Dropped Notice */}
                              <div style={{ 
                                backgroundColor: '#e3f2fd', 
                                border: '1px solid #2196f3', 
                                borderRadius: '0.5rem', 
                                padding: '0.75rem', 
                                marginBottom: '1rem',
                                fontSize: '0.9rem',
                                color: '#1976d2'
                              }}>
                                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Scoring Method</div>
                                <div>High & Low Dropped • Average of 7 Scores</div>
                                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.8 }}>
                                  The highest and lowest scores are automatically dropped to ensure fair evaluation.
                                </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
        </div>

        {/* Submit Button */}
        <div className="admin-section">
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button
              onClick={handleSubmitDeliberations}
              disabled={submitting || Object.keys(levelAssignments).length !== dancers.length || confirmedDancers.size !== dancers.length}
              className="add-dancer-button"
              style={{
                backgroundColor: submitting ? '#6c757d' : (confirmedDancers.size === dancers.length ? '#28a745' : '#ffc107'),
                padding: '1rem 2rem',
                fontSize: '1.1rem',
                fontWeight: '700',
                opacity: submitting ? 0.6 : 1
              }}
            >
              {submitting ? 'Submitting...' : 'Complete Deliberations'}
            </button>
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
              {Object.keys(levelAssignments).length} of {dancers.length} dancers assigned • {confirmedDancers.size} of {dancers.length} dancers confirmed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Deliberations;