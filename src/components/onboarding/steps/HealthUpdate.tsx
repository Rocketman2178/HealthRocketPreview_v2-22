import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useSupabase } from '../../../contexts/SupabaseContext';
import { calculateHealthScore } from '../../../lib/health/calculators/score';
import { HealthUpdateForm } from '../../health/HealthUpdateForm';
import { ArrowRight } from 'lucide-react';
import type { CategoryScores, Gender } from '../../../lib/health/types';
import { DatabaseError } from '../../../lib/errors';

interface HealthUpdateData {
  expectedLifespan: number;
  expectedHealthspan: number;
  gender: Gender;
  categoryScores: CategoryScores;
  healthGoals?: string;
}

interface HealthUpdateProps {
  onComplete?: () => void;
}
export function HealthUpdate({ onComplete }: HealthUpdateProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'metrics' | 'goals'>('metrics');
  const [formData, setFormData] = useState<HealthUpdateData>({
    expectedLifespan: 85,
    expectedHealthspan: 75,
    gender: 'Male',
    categoryScores: {
      mindset: 5,
      sleep: 5,
      exercise: 5,
      nutrition: 5,
      biohacking: 5
    },
    healthGoals: ''
  });
  const { user } = useSupabase();
  const [error, setError] = useState<Error | null>(null);

  const handleMetricsSubmit = async (data: HealthUpdateData) => {
    setFormData({
      ...data,
      healthGoals: formData.healthGoals
    });
    setStep('goals');
  };

  const handleGoalsSubmit = async (goals: string) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const healthScore = calculateHealthScore(formData.categoryScores);
      const now = new Date().toISOString();

      const { error: transactionError } = await supabase.rpc('update_health_assessment', {
        p_user_id: user.id,
        p_expected_lifespan: formData.expectedLifespan,
        p_expected_healthspan: formData.expectedHealthspan,
        p_gender: formData.gender,
        p_gender: formData.gender,
        p_health_score: healthScore,
        p_mindset_score: formData.categoryScores.mindset,
        p_sleep_score: formData.categoryScores.sleep,
        p_exercise_score: formData.categoryScores.exercise,
        p_nutrition_score: formData.categoryScores.nutrition,
        p_biohacking_score: formData.categoryScores.biohacking,
        p_created_at: now,
        p_health_goals: goals
      });
      
      if (transactionError) {
        throw new DatabaseError('Failed to update health assessment', transactionError);
      }

      // Wait for transaction to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Trigger refresh events
      window.dispatchEvent(new CustomEvent('onboardingCompleted'));
      window.dispatchEvent(new CustomEvent('dashboardUpdate'));
      window.dispatchEvent(new CustomEvent('healthUpdate'));

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error updating health:', error);
      setError(error instanceof Error ? error : new DatabaseError('Failed to complete onboarding'));
      return; // Don't proceed on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {step === 'metrics' ? (
        <HealthUpdateForm 
          onClose={() => {}} // Not needed for onboarding
          onSubmit={handleMetricsSubmit}
          loading={loading}
          error={error}
          isOnboarding={true}
          buttonText="Next"
        />
      ) : (
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white mb-1">
                Health Goals
              </h2>
            </div>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            handleGoalsSubmit(formData.healthGoals || '');
          }} className="p-4 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Please list out any health goals you have for yourself for the next 3 years. The more specific the better.
              </label>
              <textarea
                value={formData.healthGoals || ''}
                onChange={(e) => setFormData({...formData, healthGoals: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={8}
                maxLength={1000}
                placeholder="Enter your health goals here..."
              />
              <div className="text-xs text-gray-400 mt-1 text-right">
                {(formData.healthGoals?.length || 0)}/1000
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-400 text-center">{error.message}</div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('metrics')}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !formData.healthGoals?.trim()}
                className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                  !formData.healthGoals?.trim() 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {loading ? 'Processing...' : 'Complete Assessment'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}