/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  const FIELD_NAME = 'machine.os.raw';

  describe('visualize app', () => {
    before(async () => {
      await PageObjects.common.navigateToUrl('visualize', 'new');
      await PageObjects.visualize.clickInputControlVis();
      // set time range to time with no documents - input controls do not use time filter be default
      await PageObjects.header.setAbsoluteRange('2017-01-01', '2017-01-02');
      await PageObjects.visualize.clickVisEditorTab('controls');
      await PageObjects.visualize.addInputControl();
      await PageObjects.visualize.setComboBox('indexPatternSelect-0', 'logstash');
      await PageObjects.common.sleep(1000); // give time for index-pattern to be fetched
      await PageObjects.visualize.setComboBox('fieldSelect-0', FIELD_NAME);
      await PageObjects.visualize.clickGo();

      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    describe('input control visualization', () => {

      it('should not have inspector enabled', async function () {
        const spyToggleExists = await PageObjects.visualize.isInspectorButtonEnabled();
        expect(spyToggleExists).to.be(false);
      });

      describe('updateFiltersOnChange is false', () => {

        it('should contain dropdown with terms aggregation results as options', async () => {
          const menu = await PageObjects.visualize.getComboBoxOptions('listControlSelect0');
          expect(menu.trim().split('\n').join()).to.equal('ios,osx,win 7,win 8,win xp');
        });

        it('should display staging control buttons', async () => {
          const submitButtonExists = await testSubjects.exists('inputControlSubmitBtn');
          const cancelButtonExists = await testSubjects.exists('inputControlCancelBtn');
          const clearButtonExists = await testSubjects.exists('inputControlClearBtn');
          expect(submitButtonExists).to.equal(true);
          expect(cancelButtonExists).to.equal(true);
          expect(clearButtonExists).to.equal(true);
        });

        it('should stage filter when item selected but not create filter pill', async () => {
          await PageObjects.visualize.setComboBox('listControlSelect0', 'ios');

          const selectedOptions = await PageObjects.visualize.getComboBoxSelectedOptions('listControlSelect0');
          expect(selectedOptions[0].trim()).to.equal('ios');

          const hasFilter = await filterBar.hasFilter(FIELD_NAME, 'ios');
          expect(hasFilter).to.equal(false);
        });

        it('should add filter pill when submit button is clicked', async () => {
          await testSubjects.click('inputControlSubmitBtn');

          const hasFilter = await filterBar.hasFilter(FIELD_NAME, 'ios');
          expect(hasFilter).to.equal(true);
        });

        it('should replace existing filter pill(s) when new item is selected', async () => {
          await PageObjects.visualize.clearComboBox('listControlSelect0');
          await PageObjects.visualize.setComboBox('listControlSelect0', 'osx');
          await testSubjects.click('inputControlSubmitBtn');

          const hasOldFilter = await filterBar.hasFilter(FIELD_NAME, 'ios');
          const hasNewFilter = await filterBar.hasFilter(FIELD_NAME, 'osx');
          expect(hasOldFilter).to.equal(false);
          expect(hasNewFilter).to.equal(true);
        });

        it('should clear dropdown when filter pill removed', async () => {
          await filterBar.removeFilter(FIELD_NAME);
          await PageObjects.common.sleep(500); // give time for filter to be removed and event handlers to fire

          const hasValue = await PageObjects.visualize.doesComboBoxHaveSelectedOptions('listControlSelect0');
          expect(hasValue).to.equal(false);
        });

        it('should clear form when Clear button is clicked but not remove filter pill', async () => {
          await PageObjects.visualize.setComboBox('listControlSelect0', 'ios');
          await testSubjects.click('inputControlSubmitBtn');
          const hasFilterBeforeClearBtnClicked = await filterBar.hasFilter(FIELD_NAME, 'ios');
          expect(hasFilterBeforeClearBtnClicked).to.equal(true);

          await testSubjects.click('inputControlClearBtn');
          const hasValue = await PageObjects.visualize.doesComboBoxHaveSelectedOptions('listControlSelect0');
          expect(hasValue).to.equal(false);

          const hasFilterAfterClearBtnClicked = await filterBar.hasFilter(FIELD_NAME, 'ios');
          expect(hasFilterAfterClearBtnClicked).to.equal(true);
        });

        it('should remove filter pill when cleared form is submitted', async () => {
          await testSubjects.click('inputControlSubmitBtn');
          const hasFilter = await filterBar.hasFilter(FIELD_NAME, 'ios');
          expect(hasFilter).to.equal(false);
        });
      });

      describe('updateFiltersOnChange is true', () => {
        before(async () => {
          await PageObjects.visualize.clickVisEditorTab('options');
          await PageObjects.visualize.checkCheckbox('inputControlEditorUpdateFiltersOnChangeCheckbox');
          await PageObjects.visualize.clickGo();

          await PageObjects.header.waitUntilLoadingHasFinished();
        });

        after(async () => {
          await PageObjects.visualize.clickVisEditorTab('options');
          await PageObjects.visualize.uncheckCheckbox('inputControlEditorUpdateFiltersOnChangeCheckbox');
          await PageObjects.visualize.clickGo();

          await PageObjects.header.waitUntilLoadingHasFinished();
        });

        it('should not display staging control buttons', async () => {
          const submitButtonExists = await testSubjects.exists('inputControlSubmitBtn');
          const cancelButtonExists = await testSubjects.exists('inputControlCancelBtn');
          const clearButtonExists = await testSubjects.exists('inputControlClearBtn');
          expect(submitButtonExists).to.equal(false);
          expect(cancelButtonExists).to.equal(false);
          expect(clearButtonExists).to.equal(false);
        });

        it('should add filter pill when item selected', async () => {
          await PageObjects.visualize.setComboBox('listControlSelect0', 'ios');

          const selectedOptions = await PageObjects.visualize.getComboBoxSelectedOptions('listControlSelect0');
          expect(selectedOptions[0].trim()).to.equal('ios');

          const hasFilter = await filterBar.hasFilter(FIELD_NAME, 'ios');
          expect(hasFilter).to.equal(true);
        });
      });

      describe('useTimeFilter', () => {
        it('should use global time filter when getting terms', async () => {
          await PageObjects.visualize.clickVisEditorTab('options');
          await PageObjects.visualize.checkCheckbox('inputControlEditorUseTimeFilterCheckbox');
          await PageObjects.visualize.clickGo();
          await PageObjects.header.waitUntilLoadingHasFinished();

          // Expect control to be disabled because no terms could be gathered with time filter applied
          const input = await find.byCssSelector('[data-test-subj="inputControl0"] input');
          const isDisabled = await input.getProperty('disabled');
          expect(isDisabled).to.equal(true);
        });

        it('should re-create control when global time filter is updated', async () => {
          await PageObjects.header.setAbsoluteRange('2015-01-01', '2016-01-01');
          await PageObjects.header.waitUntilLoadingHasFinished();

          // Expect control to have values for selected time filter
          const menu = await PageObjects.visualize.getComboBoxOptions('listControlSelect0');
          expect(menu.trim().split('\n').join()).to.equal('osx,win 7,win 8,win xp');
        });
      });

      describe('chained controls', () => {

        before(async () => {
          await PageObjects.common.navigateToUrl('visualize', 'new');
          await PageObjects.visualize.clickInputControlVis();
          await PageObjects.visualize.clickVisEditorTab('controls');

          await PageObjects.visualize.addInputControl();
          await PageObjects.visualize.setComboBox('indexPatternSelect-0', 'logstash');
          await PageObjects.common.sleep(1000); // give time for index-pattern to be fetched
          await PageObjects.visualize.setComboBox('fieldSelect-0', 'geo.src');

          await PageObjects.visualize.addInputControl();
          await PageObjects.visualize.setComboBox('indexPatternSelect-1', 'logstash');
          await PageObjects.common.sleep(1000); // give time for index-pattern to be fetched
          await PageObjects.visualize.setComboBox('fieldSelect-1', 'clientip');
          await PageObjects.visualize.setSelectByOptionText('parentSelect-1', 'geo.src');

          await PageObjects.visualize.clickGo();
          await PageObjects.header.waitUntilLoadingHasFinished();
        });

        it('should disable child control when parent control is not set', async () => {
          const parentControlMenu = await PageObjects.visualize.getComboBoxOptions('listControlSelect0');
          expect(parentControlMenu.trim().split('\n').join()).to.equal('BR,CN,ID,IN,US');

          const childControlInput = await find.byCssSelector('[data-test-subj="inputControl1"] input');
          const isDisabled = await childControlInput.getProperty('disabled');
          expect(isDisabled).to.equal(true);
        });

        it('should filter child control options by parent control value', async () => {
          await PageObjects.visualize.setComboBox('listControlSelect0', 'BR');

          const childControlMenu = await PageObjects.visualize.getComboBoxOptions('listControlSelect1');
          expect(childControlMenu.trim().split('\n').join()).to.equal('14.61.182.136,3.174.21.181,6.183.121.70,71.241.97.89,9.69.255.135');
        });

        it('should create a seperate filter pill for parent control and child control', async () => {
          await PageObjects.visualize.setComboBox('listControlSelect1', '14.61.182.136');

          await testSubjects.click('inputControlSubmitBtn');

          const hasParentControlFilter = await filterBar.hasFilter('geo.src', 'BR');
          expect(hasParentControlFilter).to.equal(true);

          const hasChildControlFilter = await filterBar.hasFilter('clientip', '14.61.182.136');
          expect(hasChildControlFilter).to.equal(true);
        });

        it('should clear child control dropdown when parent control value is removed', async () => {
          await PageObjects.visualize.clearComboBox('listControlSelect0');
          await PageObjects.common.sleep(500); // give time for filter to be removed and event handlers to fire

          const childControlInput = await find.byCssSelector('[data-test-subj="inputControl1"] input');
          const isDisabled = await childControlInput.getProperty('disabled');
          expect(isDisabled).to.equal(true);

          await testSubjects.click('inputControlCancelBtn');
        });

        it('should clear child control dropdown when parent control filter pill removed', async () => {
          await filterBar.removeFilter('geo.src');
          await PageObjects.common.sleep(500); // give time for filter to be removed and event handlers to fire

          const hasValue = await PageObjects.visualize.doesComboBoxHaveSelectedOptions('listControlSelect0');
          expect(hasValue).to.equal(false);
        });
      });
    });
  });
}
