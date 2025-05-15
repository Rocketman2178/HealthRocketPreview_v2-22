import React, { useState } from 'react';
import { X, Radio, Zap, Trophy, Target, Brain, Moon, Activity, Apple, Database, ChevronLeft, ChevronRight, Heart, Rocket, Flame, Loader2, Check, Info } from 'lucide-react';
import { useCosmo } from '../../contexts/CosmoContext';
import { useSupabase } from '../../contexts/SupabaseContext';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { useLevelRecommendations, LevelInfo } from '../../hooks/useLevelRecommendations';
import { useNavigate } from 'react-router-dom';
import { scrollToSection } from '../../lib/utils';
import { useCompletedRecommendations } from '../../hooks/useCompletedRecommendations'; 
import { SupportForm } from '../profile/SupportForm';
import { CosmoChat } from './CosmoChat';

export function CosmoModal() {
  const { state, hideCosmo } = useCosmo();
  const { user } = useSupabase();
  const { stats } = usePlayerStats(user);
  const { recommendations, levelInfo, loading: loadingRecommendations } = useLevelRecommendations(stats.level);
  const { isRecommendationCompleted, markRecommendationComplete } = useCompletedRecommendations(user?.id);
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showSupportForm, setShowSupportForm] = useState(false);

  if (state.isMinimized) {
    return null;
  }
  
  // If selectedTopic is set, show the topic details modal
  if (selectedTopic) {
    const topic = helpTopics.find(t => t.id === selectedTopic);
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800/70 rounded-lg max-w-md w-full shadow-xl border border-gray-700/50 max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              {topic?.icon}
              <h2 className="text-lg font-semibold text-white">{topic?.title}</h2>
            </div>
            <button
              onClick={() => setSelectedTopic(null)}
              className="p-2 text-gray-400 hover:text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-6 overflow-y-auto min-h-0">
            <div className="space-y-8">
              {topic?.content.split('\n\n').map((section, i) => {
                const [title, ...content] = section.split('\n');
                return (
                  <div key={i} className="space-y-3">
                    <h4 className="text-orange-500 font-medium flex items-center gap-2">
                      {getTopicIcon(title)}
                      <span>{title}</span>
                    </h4>
                    <div className="space-y-2 pl-6">
                      {content.map((line, j) => (
                        <div key={j} className="flex items-start gap-2 text-gray-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500/50 mt-2 flex-shrink-0" />
                          <span>{line.replace('• ', '')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <button
                onClick={() => setSelectedTopic(null)}
                className="flex items-center gap-2 px-4 py-2 bg-black/20 text-orange-500 hover:text-orange-400 rounded-lg hover:bg-black/40 transition-all mt-8 w-full"
              >
                <ChevronLeft size={16} />
                <span>Back to Topics</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto" onClick={hideCosmo} />

      {/* Content */}
      <div className="bg-gray-800 rounded-lg max-w-md w-full border border-orange-500/30 shadow-[0_0_15px_rgba(255,107,0,0.15)] relative mt-8 mb-8" onClick={e => e.stopPropagation()}>
        {/* Header - now has its own stacking context */}
        <div className="flex items-center justify-between p-4 border-b border-orange-500/20 bg-gray-900 relative z-10">
          <div className="flex items-center gap-3">
            <Radio className="text-orange-500 animate-radio-wave" size={24} />
            <h2 className="text-lg font-semibold text-white flex-1 pr-4">I'm Cosmo, Your AI Health Rocket Guide</h2>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={hideCosmo}
              className="p-2 text-gray-400 hover:text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="p-4 relative">          
          {/* Welcome Message */}
          <CosmoChat onClose={hideCosmo} setActiveTab={setActiveTab} />
        </div>
      </div>
      
      {/* Support Form Modal */}
      {showSupportForm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
            <SupportForm onClose={() => setShowSupportForm(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get appropriate icon for category
function getIconForCategory(category: string | undefined) {
  if (!category) return <Rocket size={16} />;
  
  const category_lower = category.toLowerCase();
  if (category_lower === 'mindset') {
    return <Brain size={16} />;
  } else if (category_lower === 'sleep') {
    return <Moon size={16} />;
  } else if (category_lower === 'exercise') {
    return <Activity size={16} />;
  } else if (category_lower === 'nutrition') {
    return <Apple size={16} />;
  } else if (category_lower === 'biohacking') {
    return <Database size={16} />;
  } else if (category_lower === 'contests') {
    return <Trophy size={16} />;
  } else {
    return <Rocket size={16} />;
  }
}

// Helper function to get icon for topic titles
function getTopicIcon(title: string) {
  const iconMap: Record<string, React.ReactNode> = {
    'Your Mission': <Rocket size={18} />,
    'Health Categories': <Heart size={18} />,
    'Track Progress': <Target size={18} />,
    'Earn Fuel Points (FP)': <Zap size={18} />,
    'Level Up System': <Trophy size={18} />,
    'Unlock Features': <ChevronRight size={18} />,
    'Daily Actions': <Activity size={18} />,
    'Burn Streak Bonuses': <Flame size={18} />,
    'Pro Features': <Trophy size={18} />,
    'Challenges': <Target size={18} />,
    'Quests': <Trophy size={18} />,
    'Pro Content': <ChevronRight size={18} />,
    'HealthScore Categories': <Heart size={18} />,
    'Progress Tracking': <Target size={18} />,
    'Monthly Status Ranks': <Trophy size={18} />,
    'Prize System': <Trophy size={18} />,
    'Mindset Experts': <Brain size={18} className="text-orange-500" />,
    'Sleep Experts': <Brain size={18} className="text-blue-500" />,
    'Exercise Experts': <Brain size={18} className="text-lime-500" />,
    'Nutrition Experts': <Brain size={18} className="text-yellow-500" />,
    'Biohacking Experts': <Brain size={18} className="text-purple-500" />
  };

  return iconMap[title] || <ChevronRight size={18} />;
}