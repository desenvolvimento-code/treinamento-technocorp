import React from 'react'
import { path } from 'ramda'
import classNames from 'classnames'
import { useSearchPage } from 'vtex.search-page-context/SearchPageContext'

import PageNavigatorButton from './components/PageNavigatorButton'
import { usePageNavigation } from './hooks/usePageNavigation'
import { useCssHandles } from 'vtex.css-handles'
import _style from './styles.css'

const CSS_HANDLES = [
  "pagination--layout"
];

const Pagination = ({ htmlElementForButton = 'button' }) => {
  const { handles } = useCssHandles(CSS_HANDLES);
  const { searchQuery, maxItemsPerPage, page } = useSearchPage()
  const products = path(['data', 'productSearch', 'products'], searchQuery)
  const recordsFiltered = path(
    ['data', 'productSearch', 'recordsFiltered'],
    searchQuery
  )

  const fetchMore = path(['fetchMore'], searchQuery)

  const queryData = {
    query: path(['variables', 'query'], searchQuery),
    map: path(['variables', 'map'], searchQuery),
    orderBy: path(['variables', 'orderBy'], searchQuery),
    priceRange: path(['variables', 'priceRange'], searchQuery),
  }

  const { handleFetchPageNext, handleFetchPagePrevious, handleGoTo, loading, to, from, nextPage, previousPage, currentPage } = usePageNavigation({
    page,
    recordsFiltered,
    maxItemsPerPage,
    fetchMore,
    products,
    queryData,
  })

  return (
    <div
      className={classNames(
        handles['pagination--layout'],
        'w-100 flex justify-center'
      )}
    >
      <PageNavigatorButton
        products={products}
        to={to}
        from={from}
        currentPage={currentPage}
        recordsFiltered={recordsFiltered}
        onFetchMore={handleFetchPageNext}
        onFetchPrevious={handleFetchPagePrevious}
        onFetchGoTo={handleGoTo}
        loading={loading}
        showProductsCount={false}
        htmlElementForButton={htmlElementForButton}
        nextPage={nextPage}
        previousPage={previousPage}
        maxItemsPerPage={maxItemsPerPage}
      />
    </div>
  );
}

Pagination.schema = {
  title: 'admin/editor.search-result.fetch-more',
}

export default Pagination
