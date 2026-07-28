// scripts/migrateScoringMethod.js
const { db } = require('../config/firebase');

/**
 * Migration script to add scoring_method and scoring_config to existing
 * categories and levels.
 * 
 * Run with: node scripts/migrateScoringMethod.js
 */
async function migrateScoringMethod() {
  console.log('🔄 Starting scoring_method and scoring_config migration...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const categoriesSnapshot = await db.collection('exam_categories').get();
    console.log(`📊 Found ${categoriesSnapshot.size} categories to process`);
    
    let categoryCount = 0;
    let levelCount = 0;
    
    for (const catDoc of categoriesSnapshot.docs) {
      const categoryId = catDoc.id;
      const categoryData = catDoc.data();
      
      console.log(`\n📂 Processing category: ${categoryId}`);
      console.log(`   Current passing_type: ${categoryData.passing_type || 'Not set'}`);
      
      // Determine scoring method based on passing_type
      let scoringMethod = 'RAW_SCORE';
      let scoringConfig = { totalMaxScore: 100 };
      
      if (categoryData.passing_type === 'TOTAL_AND_SECTION') {
        scoringMethod = 'GROUPED_SECTION';
        scoringConfig = {
          groups: [
            { 
              name: 'Language Knowledge + Reading', 
              sections: ['Vocabulary', 'Grammar', 'Reading'], 
              maxScore: 120 
            },
            { 
              name: 'Listening', 
              sections: ['Listening'], 
              maxScore: 60 
            }
          ],
          totalMaxScore: 180
        };
        console.log(`   ✅ Assigned GROUPED_SECTION for JLPT`);
      } else if (categoryData.passing_type === 'LEVEL_RANGE') {
        scoringMethod = 'RAW_SCORE';
        scoringConfig = { totalMaxScore: 200 };
        console.log(`   ✅ Assigned RAW_SCORE for TOPIK I`);
      } else if (categoryData.passing_type === 'CUT_OFF_SCORE') {
        scoringMethod = 'RAW_SCORE';
        scoringConfig = { totalMaxScore: 100 };
        console.log(`   ✅ Assigned RAW_SCORE for EPS-TOPIK`);
      } else {
        scoringMethod = 'RAW_SCORE';
        scoringConfig = { totalMaxScore: 100 };
        console.log(`   ℹ️ Using default RAW_SCORE for unknown type`);
      }
      
      // Check if category already has scoring_method
      if (categoryData.scoring_method !== undefined) {
        console.log(`   ⏭️ Category already has scoring_method: ${categoryData.scoring_method}, skipping`);
        continue;
      }
      
      // Update category
      await catDoc.ref.update({
        scoring_method: scoringMethod,
        scoring_config: scoringConfig,
        updated_at: new Date().toISOString()
      });
      console.log(`   ✅ Updated category: ${categoryId}`);
      categoryCount++;
      
      // Update levels
      const levelsSnapshot = await db.collection(`exam_categories/${categoryId}/levels`).get();
      let levelUpdateCount = 0;
      
      for (const levelDoc of levelsSnapshot.docs) {
        const levelData = levelDoc.data();
        
        // Only update if level doesn't already have scoring_method
        if (levelData.scoring_method === undefined) {
          await levelDoc.ref.update({
            scoring_method: null,  // Inherit from category
            scoring_config: null,  // Inherit from category
            updated_at: new Date().toISOString()
          });
          levelUpdateCount++;
        }
      }
      
      levelCount += levelUpdateCount;
      console.log(`   ✅ Updated ${levelUpdateCount} levels for ${categoryId}`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Migration complete!');
    console.log(`📊 Updated ${categoryCount} categories and ${levelCount} levels`);
    console.log('\n📋 Summary:');
    console.log('   - Categories with scoring_method now have proper configuration');
    console.log('   - Levels now inherit scoring_method from their parent category');
    console.log('   - All existing data is preserved');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateScoringMethod().then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
});